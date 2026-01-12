import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destinations.entity';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface EnrichedDescription {
  descriptionViet: string;
  descriptionEng: string;
}

@Injectable()
export class DestinationEnrichmentService {
  private readonly logger = new Logger(DestinationEnrichmentService.name);
  private geminiClients: GoogleGenerativeAI[] = [];
  private currentClientIndex = 0;
  private readonly modelName = 'gemini-2.0-flash';

  constructor(
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
    private readonly configService: ConfigService,
  ) {
    this.initializeGeminiClients();
  }

  private initializeGeminiClients(): void {
    const rawKeys =
      this.configService.get<string>('GEMINI_API_KEYS') ||
      this.configService.get<string>('gemini.apiKey') ||
      process.env.GEMINI_API_KEY ||
      '';

    const keys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keys.length > 0) {
      this.geminiClients = keys.map((key) => new GoogleGenerativeAI(key));
      this.logger.log(`Initialized ${this.geminiClients.length} Gemini API keys for enrichment`);
    } else {
      this.logger.warn('No Gemini API keys configured for enrichment service');
    }
  }

  private getNextClient(): GoogleGenerativeAI | null {
    if (this.geminiClients.length === 0) return null;
    const client = this.geminiClients[this.currentClientIndex];
    this.currentClientIndex = (this.currentClientIndex + 1) % this.geminiClients.length;
    return client;
  }

  /**
   * Generate bilingual descriptions for a single destination using Gemini AI.
   */
  async generateDescriptions(destination: Destination): Promise<EnrichedDescription | null> {
    const client = this.getNextClient();
    if (!client) {
      this.logger.error('No Gemini client available');
      return null;
    }

    const prompt = `Bạn là chuyên gia du lịch Việt Nam. Hãy viết mô tả ngắn gọn (2-3 câu, khoảng 50-80 từ) cho địa điểm du lịch sau:

Tên địa điểm: ${destination.name}
Loại hình: ${destination.categories?.join(', ') || 'Địa điểm du lịch'}
Tỉnh/Thành phố: ${destination.province}
Quận/Huyện: ${destination.district || 'Không rõ'}

YÊU CẦU:
1. Mô tả phải NÓI VỀ ĐỊA ĐIỂM CỤ THỂ, KHÔNG nói về tỉnh/thành phố chung chung
2. Nêu điểm đặc sắc, lý do nên ghé thăm
3. Ngắn gọn, hấp dẫn, thu hút du khách

Trả lời theo định dạng JSON (KHÔNG có markdown code block):
{
  "descriptionViet": "Mô tả tiếng Việt ở đây",
  "descriptionEng": "English description here"
}`;

    try {
      const model = client.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as EnrichedDescription;
        return parsed;
      }
      
      this.logger.warn(`Failed to parse JSON from Gemini response for destination ${destination.id}`);
      return null;
    } catch (error) {
      this.logger.error(`Gemini API error for destination ${destination.id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Enrich a single destination with AI-generated descriptions.
   */
  async enrichDestination(id: number): Promise<Destination | null> {
    const destination = await this.destinationRepo.findOne({ where: { id } });
    if (!destination) {
      this.logger.warn(`Destination ${id} not found`);
      return null;
    }

    const descriptions = await this.generateDescriptions(destination);
    if (!descriptions) return null;

    destination.descriptionViet = descriptions.descriptionViet;
    destination.descriptionEng = descriptions.descriptionEng;
    
    await this.destinationRepo.save(destination);
    this.logger.log(`Enriched destination ${id}: ${destination.name}`);
    
    return destination;
  }

  /**
   * Batch enrich multiple destinations.
   * @param limit Maximum number to process
   * @param onlyEmpty Only process destinations with empty descriptions
   * @param delayMs Delay between API calls to avoid rate limiting
   */
  async batchEnrich(
    limit: number = 10,
    onlyEmpty: boolean = true,
    delayMs: number = 1000,
  ): Promise<{ processed: number; success: number; failed: number }> {
    const query = this.destinationRepo.createQueryBuilder('d')
      .where('d.available = :available', { available: true });

    if (onlyEmpty) {
      query.andWhere('(d.descriptionViet IS NULL OR d.descriptionViet = :empty OR d.descriptionEng IS NULL OR d.descriptionEng = :empty)', 
        { empty: '' });
    }

    const destinations = await query.take(limit).getMany();
    
    let processed = 0;
    let success = 0;
    let failed = 0;

    for (const dest of destinations) {
      processed++;
      
      const descriptions = await this.generateDescriptions(dest);
      
      if (descriptions) {
        dest.descriptionViet = descriptions.descriptionViet;
        dest.descriptionEng = descriptions.descriptionEng;
        await this.destinationRepo.save(dest);
        success++;
        this.logger.log(`[${processed}/${destinations.length}] ✓ ${dest.name}`);
      } else {
        failed++;
        this.logger.warn(`[${processed}/${destinations.length}] ✗ ${dest.name}`);
      }

      // Delay to avoid rate limiting
      if (processed < destinations.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return { processed, success, failed };
  }

  /**
   * Get statistics on description coverage.
   */
  async getEnrichmentStats(): Promise<{
    total: number;
    withViDesc: number;
    withEnDesc: number;
    withBoth: number;
    needsEnrichment: number;
  }> {
    const total = await this.destinationRepo.count({ where: { available: true } });
    
    const withViDesc = await this.destinationRepo
      .createQueryBuilder('d')
      .where('d.available = true')
      .andWhere('d.descriptionViet IS NOT NULL AND d.descriptionViet != :empty', { empty: '' })
      .getCount();

    const withEnDesc = await this.destinationRepo
      .createQueryBuilder('d')
      .where('d.available = true')
      .andWhere('d.descriptionEng IS NOT NULL AND d.descriptionEng != :empty', { empty: '' })
      .getCount();

    const withBoth = await this.destinationRepo
      .createQueryBuilder('d')
      .where('d.available = true')
      .andWhere('d.descriptionViet IS NOT NULL AND d.descriptionViet != :empty', { empty: '' })
      .andWhere('d.descriptionEng IS NOT NULL AND d.descriptionEng != :empty', { empty: '' })
      .getCount();

    return {
      total,
      withViDesc,
      withEnDesc,
      withBoth,
      needsEnrichment: total - withBoth,
    };
  }

  /**
   * Check if a description is low quality (describes province instead of destination).
   * Returns true if the description appears generic/low quality.
   */
  private isLowQualityDescription(dest: Destination): boolean {
    const desc = dest.descriptionViet || '';
    const name = dest.name || '';
    const province = dest.province || '';
    
    if (!desc || desc.length < 20) return true;
    
    // Patterns that indicate generic province descriptions
    const genericPatterns = [
      'là một trong sáu thành phố trực thuộc',
      'là thủ đô của nước',
      'là thành phố trực thuộc trung ương',
      'nằm tại khu vực',
      'là thành phố lớn nhất',
      'diện tích',
      'dân số',
      'đơn vị hành chính',
      'trung tâm chính trị',
      'một quốc gia',
      'là một đảo quốc',
      `${province} là`,
    ];
    
    const descLower = desc.toLowerCase();
    const isGeneric = genericPatterns.some(pattern => descLower.includes(pattern.toLowerCase()));
    
    // Check if description mentions the destination name
    const mentionsDestination = desc.includes(name) || descLower.includes(name.toLowerCase());
    
    // Description is low quality if it's generic AND doesn't mention the destination
    return isGeneric && !mentionsDestination;
  }

  /**
   * Export destinations for translation workflow (Google Sheets).
   * Includes quality flags to help identify which descriptions need rewriting.
   */
  async exportForTranslation(onlyNeedsTranslation: boolean = false): Promise<{
    summary: { total: number; needsEnglish: number; lowQuality: number };
    data: any[];
  }> {
    let query = this.destinationRepo.createQueryBuilder('d')
      .where('d.available = true');

    if (onlyNeedsTranslation) {
      query = query.andWhere('(d.descriptionEng IS NULL OR d.descriptionEng = :empty)', { empty: '' });
    }

    const destinations = await query.orderBy('d.id', 'ASC').getMany();
    
    let needsEnglish = 0;
    let lowQuality = 0;
    
    const data = destinations.map(dest => {
      const isLowQuality = this.isLowQualityDescription(dest);
      const needsEng = !dest.descriptionEng || dest.descriptionEng.trim() === '';
      
      if (needsEng) needsEnglish++;
      if (isLowQuality) lowQuality++;
      
      return {
        id: dest.id,
        name: dest.name,
        category: dest.categories?.join(', ') || 'Không xác định',
        province: dest.province,
        district: dest.district,
        descriptionViet: dest.descriptionViet || '',
        descriptionEng: dest.descriptionEng || '',
        // Quality flags
        isLowQuality,
        needsEnglish: needsEng,
        // Truncated preview for review
        descriptionPreview: (dest.descriptionViet || '').substring(0, 100) + '...',
      };
    });

    return {
      summary: {
        total: destinations.length,
        needsEnglish,
        lowQuality,
      },
      data,
    };
  }

  /**
   * Import translated/updated descriptions from CSV data.
   */
  async importTranslations(
    data: { id: number; descriptionViet?: string; descriptionEng?: string }[],
  ): Promise<{ updated: number; skipped: number; errors: string[] }> {
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of data) {
      try {
        const dest = await this.destinationRepo.findOne({ where: { id: item.id } });
        
        if (!dest) {
          errors.push(`Destination ${item.id} not found`);
          skipped++;
          continue;
        }

        let hasChanges = false;
        
        if (item.descriptionViet && item.descriptionViet.trim() !== '') {
          dest.descriptionViet = item.descriptionViet.trim();
          hasChanges = true;
        }
        
        if (item.descriptionEng && item.descriptionEng.trim() !== '') {
          dest.descriptionEng = item.descriptionEng.trim();
          hasChanges = true;
        }

        if (hasChanges) {
          await this.destinationRepo.save(dest);
          updated++;
          this.logger.log(`Updated destination ${item.id}: ${dest.name}`);
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push(`Error updating ${item.id}: ${error.message}`);
        skipped++;
      }
    }

    return { updated, skipped, errors };
  }
}
