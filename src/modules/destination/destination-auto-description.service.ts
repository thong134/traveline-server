import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destinations.entity';

interface DescriptionTemplate {
  pattern: RegExp;
  type: string;
  templateVi: (name: string, province: string) => string;
  templateEn: (name: string, province: string) => string;
}

@Injectable()
export class DestinationAutoDescriptionService {
  private readonly logger = new Logger(DestinationAutoDescriptionService.name);

  // Templates for different destination types
  private readonly templates: DescriptionTemplate[] = [
    // Chùa
    {
      pattern: /^Chùa\s+/i,
      type: 'Chùa',
      templateVi: (name, province) =>
        `${name} là một ngôi chùa cổ kính tọa lạc tại ${province}. Đây là điểm đến tâm linh thu hút du khách bởi kiến trúc truyền thống, không gian thanh tịnh và những giá trị văn hóa Phật giáo đặc sắc.`,
      templateEn: (name, province) =>
        `${name} is an ancient Buddhist pagoda located in ${province}. This spiritual destination attracts visitors with its traditional architecture, serene atmosphere, and rich Buddhist cultural heritage.`,
    },
    // Nhà thờ
    {
      pattern: /Nhà\s*[Tt]hờ|Giáo\s*[Xx]ứ|Đền\s*Thánh/i,
      type: 'Nhà thờ',
      templateVi: (name, province) =>
        `${name} là một công trình kiến trúc tôn giáo tại ${province}. Nhà thờ mang đậm nét kiến trúc Công giáo với những họa tiết tinh xảo, là điểm đến yên bình cho du khách muốn tìm hiểu văn hóa và tín ngưỡng.`,
      templateEn: (name, province) =>
        `${name} is a religious architectural landmark in ${province}. This Catholic church features exquisite architectural details and serves as a peaceful destination for visitors interested in culture and faith.`,
    },
    // Đền, Đình
    {
      pattern: /^(Đền|Đình)\s+/i,
      type: 'Đền/Đình',
      templateVi: (name, province) =>
        `${name} là một di tích lịch sử - văn hóa quan trọng tại ${province}. Công trình thờ tự này lưu giữ những giá trị truyền thống và là nơi diễn ra nhiều lễ hội văn hóa đặc sắc hàng năm.`,
      templateEn: (name, province) =>
        `${name} is an important historical and cultural heritage site in ${province}. This traditional temple preserves cultural values and hosts various colorful festivals throughout the year.`,
    },
    // Bảo tàng
    {
      pattern: /Bảo\s*[Tt]àng/i,
      type: 'Bảo tàng',
      templateVi: (name, province) =>
        `${name} là bảo tàng nổi tiếng tại ${province}, nơi trưng bày và bảo tồn nhiều hiện vật quý giá. Du khách có thể khám phá lịch sử, văn hóa và di sản thông qua các bộ sưu tập đa dạng.`,
      templateEn: (name, province) =>
        `${name} is a renowned museum in ${province}, displaying and preserving valuable artifacts. Visitors can explore history, culture, and heritage through diverse collections.`,
    },
    // Bãi biển
    {
      pattern: /Bãi\s*[Bb]iển|Beach/i,
      type: 'Biển',
      templateVi: (name, province) =>
        `${name} là bãi biển đẹp nằm tại ${province} với bờ cát trắng mịn và làn nước trong xanh. Đây là điểm đến lý tưởng để tắm biển, thư giãn và ngắm hoàng hôn tuyệt đẹp.`,
      templateEn: (name, province) =>
        `${name} is a beautiful beach in ${province} with fine white sand and crystal-clear waters. It's an ideal destination for swimming, relaxation, and enjoying stunning sunsets.`,
    },
    // Núi, Đỉnh
    {
      pattern: /^(Núi|Đỉnh|Hòn|Ngũ Hành)/i,
      type: 'Núi',
      templateVi: (name, province) =>
        `${name} là danh thắng thiên nhiên nổi tiếng tại ${province}. Với cảnh quan hùng vĩ và không khí trong lành, nơi đây thu hút du khách đến leo núi, ngắm cảnh và khám phá thiên nhiên hoang sơ.`,
      templateEn: (name, province) =>
        `${name} is a famous natural landmark in ${province}. With majestic scenery and fresh air, it attracts visitors for hiking, sightseeing, and exploring pristine nature.`,
    },
    // Công viên, Khu vui chơi
    {
      pattern:
        /Công\s*[Vv]iên|Park|Khu\s*[Dd]u\s*[Ll]ịch|Khu\s*[Vv]ui\s*[Cc]hơi/i,
      type: 'Công viên',
      templateVi: (name, province) =>
        `${name} là điểm vui chơi giải trí hấp dẫn tại ${province}. Với nhiều hoạt động thú vị và không gian xanh mát, nơi đây là lựa chọn hoàn hảo cho các gia đình và du khách.`,
      templateEn: (name, province) =>
        `${name} is an exciting entertainment destination in ${province}. With various fun activities and lush green spaces, it's a perfect choice for families and visitors.`,
    },
    // Nhà hát
    {
      pattern: /Nhà\s*[Hh]át/i,
      type: 'Nhà hát',
      templateVi: (name, province) =>
        `${name} là công trình nghệ thuật biểu diễn nổi tiếng tại ${province}. Nơi đây thường xuyên tổ chức các chương trình ca nhạc, kịch và biểu diễn nghệ thuật đặc sắc.`,
      templateEn: (name, province) =>
        `${name} is a famous performing arts venue in ${province}. It regularly hosts concerts, theatrical performances, and various artistic events.`,
    },
    // Dinh, Phủ, Hoàng Thành
    {
      pattern: /(Dinh|Phủ|Hoàng\s*[Tt]hành|Thành\s*[Cc]ổ)/i,
      type: 'Di tích',
      templateVi: (name, province) =>
        `${name} là di tích lịch sử quan trọng tại ${province}. Công trình kiến trúc này mang đậm dấu ấn lịch sử và là điểm đến không thể bỏ qua cho những ai yêu thích khám phá văn hóa.`,
      templateEn: (name, province) =>
        `${name} is an important historical monument in ${province}. This architectural landmark carries significant historical value and is a must-visit for culture enthusiasts.`,
    },
    // Resort, Hotel, Khách sạn
    {
      pattern: /(Resort|Hotel|Khách\s*[Ss]ạn)/i,
      type: 'Khách sạn',
      templateVi: (name, province) =>
        `${name} là điểm lưu trú cao cấp tại ${province}, mang đến trải nghiệm nghỉ dưỡng tuyệt vời với dịch vụ chuyên nghiệp và tiện nghi hiện đại.`,
      templateEn: (name, province) =>
        `${name} is a premium accommodation in ${province}, offering an excellent resort experience with professional service and modern amenities.`,
    },
    // Suối
    {
      pattern: /^Suối\s+/i,
      type: 'Suối',
      templateVi: (name, province) =>
        `${name} là điểm du lịch sinh thái tại ${province}. Với dòng nước mát lành và cảnh quan thiên nhiên tươi đẹp, nơi đây là địa điểm lý tưởng để thư giãn và tận hưởng không khí trong lành.`,
      templateEn: (name, province) =>
        `${name} is an eco-tourism destination in ${province}. With refreshing streams and beautiful natural scenery, it's an ideal place to relax and enjoy fresh air.`,
    },
    // Phố đi bộ
    {
      pattern: /Phố\s*[Đđ]i\s*[Bb]ộ/i,
      type: 'Phố đi bộ',
      templateVi: (name, province) =>
        `${name} là khu phố đi bộ sôi động tại ${province}. Nơi đây tập trung nhiều quán ăn, cửa hàng và hoạt động giải trí, là điểm đến lý tưởng để khám phá văn hóa địa phương.`,
      templateEn: (name, province) =>
        `${name} is a vibrant pedestrian street in ${province}. With numerous restaurants, shops, and entertainment activities, it's an ideal place to explore local culture.`,
    },
    // Làng
    {
      pattern: /^Làng\s+/i,
      type: 'Làng',
      templateVi: (name, province) =>
        `${name} là làng nghề truyền thống tại ${province}. Du khách có thể trải nghiệm cuộc sống thôn quê thanh bình và tìm hiểu các nghề thủ công đặc sắc của địa phương.`,
      templateEn: (name, province) =>
        `${name} is a traditional craft village in ${province}. Visitors can experience peaceful rural life and learn about unique local handicrafts.`,
    },
    // Food Tour, Tour
    {
      pattern: /(Food\s*Tour|Tour)/i,
      type: 'Tour',
      templateVi: (name, province) =>
        `${name} là trải nghiệm du lịch độc đáo tại ${province}. Tham gia tour này, du khách sẽ được khám phá ẩm thực và văn hóa địa phương đặc sắc.`,
      templateEn: (name, province) =>
        `${name} offers a unique travel experience in ${province}. Participants can explore distinctive local cuisine and culture.`,
    },
    // Golf
    {
      pattern: /Golf/i,
      type: 'Sân golf',
      templateVi: (name, province) =>
        `${name} là sân golf đẳng cấp tại ${province}. Với thiết kế chuyên nghiệp và cảnh quan tuyệt đẹp, nơi đây mang đến trải nghiệm chơi golf tuyệt vời.`,
      templateEn: (name, province) =>
        `${name} is a world-class golf course in ${province}. With professional design and stunning landscapes, it offers an excellent golfing experience.`,
    },
  ];

  // Fallback template for unmatched destinations
  private readonly fallbackTemplate: DescriptionTemplate = {
    pattern: /.*/,
    type: 'Địa điểm',
    templateVi: (name, province) =>
      `${name} là điểm đến du lịch hấp dẫn tại ${province}. Nơi đây thu hút du khách bởi vẻ đẹp độc đáo và những trải nghiệm thú vị không thể bỏ qua.`,
    templateEn: (name, province) =>
      `${name} is an attractive tourist destination in ${province}. It captivates visitors with its unique charm and unforgettable experiences.`,
  };

  constructor(
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
  ) {}

  /**
   * Detect destination type from name and return matching template.
   */
  private detectTemplate(name: string): DescriptionTemplate {
    for (const template of this.templates) {
      if (template.pattern.test(name)) {
        return template;
      }
    }
    return this.fallbackTemplate;
  }

  /**
   * Check if a description is low quality (describes province instead of destination).
   */
  private isLowQualityDescription(desc: string, province: string): boolean {
    if (!desc || desc.length < 20) return true;

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
      'Cộng hòa Pháp',
      'Singapore',
      'Gia Cát Lượng',
      'Hồ Chí Minh, tên khai sinh',
      `${province} là`,
    ];

    const descLower = desc.toLowerCase();
    return genericPatterns.some((pattern) =>
      descLower.includes(pattern.toLowerCase()),
    );
  }

  /**
   * Generate descriptions for a single destination.
   */
  generateDescriptions(
    name: string,
    province: string,
  ): { descriptionViet: string; descriptionEng: string; type: string } {
    const template = this.detectTemplate(name);
    return {
      descriptionViet: template.templateVi(name, province),
      descriptionEng: template.templateEn(name, province),
      type: template.type,
    };
  }

  /**
   * Auto-fix low quality descriptions for destinations.
   */
  async autoFixLowQualityDescriptions(
    limit: number = 100,
    dryRun: boolean = false,
  ): Promise<{
    processed: number;
    fixed: number;
    skipped: number;
    preview: any[];
  }> {
    const destinations = await this.destinationRepo.find({
      where: { available: true },
      order: { id: 'ASC' },
      take: limit,
    });

    let processed = 0;
    let fixed = 0;
    let skipped = 0;
    const preview: any[] = [];

    for (const dest of destinations) {
      processed++;

      const isLowQuality = this.isLowQualityDescription(
        dest.descriptionViet || '',
        dest.province || '',
      );

      if (!isLowQuality) {
        skipped++;
        continue;
      }

      const newDescriptions = this.generateDescriptions(
        dest.name,
        dest.province || 'Việt Nam',
      );

      preview.push({
        id: dest.id,
        name: dest.name,
        province: dest.province,
        detectedType: newDescriptions.type,
        oldDescription: (dest.descriptionViet || '').substring(0, 100) + '...',
        newDescriptionVi: newDescriptions.descriptionViet,
        newDescriptionEn: newDescriptions.descriptionEng,
      });

      if (!dryRun) {
        dest.descriptionViet = newDescriptions.descriptionViet;
        dest.descriptionEng = newDescriptions.descriptionEng;
        await this.destinationRepo.save(dest);
        fixed++;
        this.logger.log(
          `[${processed}/${destinations.length}] Fixed: ${dest.name} (${newDescriptions.type})`,
        );
      } else {
        fixed++;
      }
    }

    return { processed, fixed, skipped, preview: preview.slice(0, 20) };
  }

  /**
   * Process all destinations with low quality descriptions.
   */
  async processAll(batchSize: number = 100): Promise<{
    totalProcessed: number;
    totalFixed: number;
    totalSkipped: number;
  }> {
    let totalProcessed = 0;
    let totalFixed = 0;
    let totalSkipped = 0;
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const destinations = await this.destinationRepo.find({
        where: { available: true },
        order: { id: 'ASC' },
        skip: offset,
        take: batchSize,
      });

      if (destinations.length === 0) {
        hasMore = false;
        break;
      }

      for (const dest of destinations) {
        totalProcessed++;

        const isLowQuality = this.isLowQualityDescription(
          dest.descriptionViet || '',
          dest.province || '',
        );

        if (!isLowQuality) {
          totalSkipped++;
          continue;
        }

        const newDescriptions = this.generateDescriptions(
          dest.name,
          dest.province || 'Việt Nam',
        );

        dest.descriptionViet = newDescriptions.descriptionViet;
        dest.descriptionEng = newDescriptions.descriptionEng;
        await this.destinationRepo.save(dest);
        totalFixed++;

        this.logger.log(`[${totalProcessed}] Fixed: ${dest.name}`);
      }

      offset += batchSize;
      this.logger.log(`Batch completed. Total fixed: ${totalFixed}`);
    }

    return { totalProcessed, totalFixed, totalSkipped };
  }
}
