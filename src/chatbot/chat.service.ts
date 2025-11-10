import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
//import OpenAI from 'openai'; // Legacy GPT import kept for reference
import {
  GenerateContentResult,
  GenerativeModel,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import { Repository } from 'typeorm';
import { Destination } from '../destinations/destinations.entity';
import { Cooperation } from '../cooperations/cooperation.entity';
import { ChatCache } from './chat-cache.entity';

type ChatIntent =
  | 'destination'
  | 'restaurant'
  | 'hotel'
  | 'service'
  | 'app_guide'
  | 'other';

type ChatLanguage = 'vi' | 'en';

type Classification = {
  intent: ChatIntent;
  keywords: string[];
};

type ChatResultItem = {
  name: string;
  address?: string;
  description?: string;
  type: 'destination' | 'restaurant' | 'hotel';
};

type ChatResponse =
  | { source: 'database'; data: ChatResultItem[]; text?: string }
  | { source: 'ai'; text: string };

@Injectable()
export class ChatService {
  //private readonly model = 'gpt-4o-mini'; // Legacy GPT model kept for reference
  private readonly modelName = 'gemini-2.5-flash';
  private geminiClient: GoogleGenerativeAI | null = null;
  private generativeModel: GenerativeModel | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(ChatCache)
    private readonly cacheRepo: Repository<ChatCache>,
  ) {}

  async handleChat(
    rawMessage: string,
    lang: string | undefined,
  ): Promise<ChatResponse> {
    const message = rawMessage?.trim();
    if (!message) {
      throw new BadRequestException('Message must not be empty');
    }
    const preferredLang: ChatLanguage = lang === 'en' ? 'en' : 'vi';
    const cached = await this.cacheRepo.findOne({ where: { message } });
    if (cached) {
      return { source: 'ai', text: cached.response };
    }

    const result = await this.processChat(message, preferredLang);

    if (result.source === 'ai') {
      await this.cacheRepo.save({ message, response: result.text });
    }

    return result;
  }

  private async processChat(
    message: string,
    preferredLang: ChatLanguage,
  ): Promise<ChatResponse> {
    const classification = await this.classifyMessage(message);

    if (classification.intent === 'destination') {
      return this.handleDestinationQuery(
        classification,
        message,
        preferredLang,
      );
    }
    if (classification.intent === 'restaurant') {
      return this.handleRestaurantQuery(classification, message, preferredLang);
    }
    if (classification.intent === 'hotel') {
      return this.handleHotelQuery(classification, message, preferredLang);
    }

    return this.generateConversationalReply(
      message,
      preferredLang,
      classification.intent,
    );
  }

  private async handleDestinationQuery(
    classification: Classification,
    fallback: string,
    lang: ChatLanguage,
  ): Promise<ChatResponse> {
    const results = await this.searchDestinations(
      classification.keywords,
      fallback,
    );
    if (!results.length) {
      return this.generateConversationalReply(
        fallback,
        lang,
        'destination',
        true,
      );
    }
    const mapped = results.map((destination) => ({
      name: destination.name,
      address: this.joinAddress([
        destination.specificAddress,
        destination.province,
      ]),
      description:
        lang === 'en'
          ? (destination.descriptionEng ??
            destination.descriptionViet ??
            undefined)
          : (destination.descriptionViet ??
            destination.descriptionEng ??
            undefined),
      type: 'destination' as const,
    }));
    const summary = this.buildSummaryText('địa điểm du lịch', mapped, 'vi');
    const translatedSummary = await this.translateIfNeeded(summary, lang);
    return {
      source: 'database',
      data:
        lang === 'en'
          ? await this.translateEntries(mapped, 'destination')
          : mapped,
      text: lang === 'en' ? (translatedSummary ?? summary) : summary,
    };
  }

  private async handleRestaurantQuery(
    classification: Classification,
    fallback: string,
    lang: ChatLanguage,
  ): Promise<ChatResponse> {
    const cooperations = await this.searchCooperations(
      'restaurant',
      classification.keywords,
      fallback,
    );
    if (!cooperations.length) {
      return this.generateConversationalReply(
        fallback,
        lang,
        'restaurant',
        true,
      );
    }
    const mapped = cooperations.map((coop) => ({
      name: coop.name,
      address: this.joinAddress([
        coop.address,
        coop.district,
        coop.city,
        coop.province,
      ]),
      description: coop.introduction ?? coop.extension ?? undefined,
      type: 'restaurant' as const,
    }));
    const summary = this.buildSummaryText('nhà hàng/quán ăn', mapped, 'vi');
    const translatedSummary = await this.translateIfNeeded(summary, lang);
    return {
      source: 'database',
      data:
        lang === 'en'
          ? await this.translateEntries(mapped, 'restaurant')
          : mapped,
      text: lang === 'en' ? (translatedSummary ?? summary) : summary,
    };
  }

  private async handleHotelQuery(
    classification: Classification,
    fallback: string,
    lang: ChatLanguage,
  ): Promise<ChatResponse> {
    const cooperations = await this.searchCooperations(
      'hotel',
      classification.keywords,
      fallback,
    );
    if (!cooperations.length) {
      return this.generateConversationalReply(fallback, lang, 'hotel', true);
    }
    const mapped = cooperations.map((coop) => ({
      name: coop.name,
      address: this.joinAddress([
        coop.address,
        coop.district,
        coop.city,
        coop.province,
      ]),
      description: coop.introduction ?? coop.extension ?? undefined,
      type: 'hotel' as const,
    }));
    const summary = this.buildSummaryText('khách sạn', mapped, 'vi');
    const translatedSummary = await this.translateIfNeeded(summary, lang);
    return {
      source: 'database',
      data:
        lang === 'en' ? await this.translateEntries(mapped, 'hotel') : mapped,
      text: lang === 'en' ? (translatedSummary ?? summary) : summary,
    };
  }

  private async searchDestinations(
    keywords: string[],
    fallback: string,
  ): Promise<Destination[]> {
    const terms = this.normalizeKeywords(keywords, fallback);
    const qb = this.destinationRepo.createQueryBuilder('destination');

    if (terms.length) {
      const clauses: string[] = [];
      terms.forEach((term, index) => {
        const key = `kw${index}`;
        clauses.push(
          `(destination.name ILIKE :${key} OR destination.province ILIKE :${key} OR COALESCE(destination.descriptionViet, '') ILIKE :${key} OR COALESCE(destination.descriptionEng, '') ILIKE :${key})`,
        );
        qb.setParameter(key, `%${term}%`);
      });
      qb.where(clauses.join(' OR '));
    }

    return qb.orderBy('destination.favouriteTimes', 'DESC').take(3).getMany();
  }

  private async searchCooperations(
    type: 'restaurant' | 'hotel',
    keywords: string[],
    fallback: string,
  ): Promise<Cooperation[]> {
    const terms = this.normalizeKeywords(keywords, fallback);
    const qb = this.cooperationRepo
      .createQueryBuilder('cooperation')
      .where('cooperation.type = :type', { type })
      .andWhere('cooperation.active = :active', { active: true });

    if (terms.length) {
      const clauses: string[] = [];
      terms.forEach((term, index) => {
        const key = `kw${index}`;
        clauses.push(
          `(cooperation.name ILIKE :${key} OR COALESCE(cooperation.city, '') ILIKE :${key} OR COALESCE(cooperation.province, '') ILIKE :${key} OR COALESCE(cooperation.introduction, '') ILIKE :${key})`,
        );
        qb.setParameter(key, `%${term}%`);
      });
      qb.andWhere(clauses.map((clause) => `(${clause})`).join(' OR '));
    }

    return qb.orderBy('cooperation.bookingTimes', 'DESC').take(3).getMany();
  }

  private normalizeKeywords(keywords: string[], fallback: string): string[] {
    const normalized = keywords
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0)
      .slice(0, 5);
    if (!normalized.length) {
      normalized.push(fallback);
    }
    return normalized;
  }

  private joinAddress(parts: Array<string | undefined>): string | undefined {
    const value = parts.filter((part) => part && part.trim().length).join(', ');
    return value.length ? value : undefined;
  }

  private buildSummaryText(
    kind: string,
    items: ChatResultItem[],
    lang: ChatLanguage,
  ): string {
    if (!items.length) {
      return '';
    }
    if (lang === 'en') {
      return items
        .map(
          (item, index) =>
            `${index + 1}. ${item.name}${item.address ? ` - ${item.address}` : ''}`,
        )
        .join('\n');
    }
    const header = `Dưới đây là một vài ${kind} bạn có thể tham khảo:`;
    const bullet = items
      .map((item) => {
        const address = item.address ? `, địa chỉ: ${item.address}` : '';
        const description = item.description
          ? `. Gợi ý: ${item.description}`
          : '';
        return `• ${item.name}${address}${description}`;
      })
      .join('\n');
    return `${header}\n${bullet}`;
  }

  private async translateIfNeeded(
    text: string,
    lang: ChatLanguage,
  ): Promise<string | undefined> {
    if (lang !== 'en' || !text.trim()) {
      return undefined;
    }
    const response = await this.performModelCall((model) =>
      model.generateContent({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: 'You translate Vietnamese travel recommendations into natural English. Keep the structure and numbering when present.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
      }),
    );
    return this.extractText(response) || text;
  }

  private async translateEntries(
    items: ChatResultItem[],
    _category: 'destination' | 'restaurant' | 'hotel',
  ): Promise<ChatResultItem[]> {
    void _category;
    const descriptions = items
      .map((item, index) => `${index + 1}. ${item.description ?? item.name}`)
      .join('\n');
    if (!descriptions.trim()) {
      return items;
    }
    const response = await this.performModelCall((model) =>
      model.generateContent({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: 'Translate the following Vietnamese descriptions into concise English. Preserve the numbering and return only the translated lines.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: descriptions }],
          },
        ],
      }),
    );
    const translated = this.extractText(response);
    if (!translated) {
      return items;
    }
    const lines = translated
      .split(/\r?\n/)
      .filter((line) => line.trim().length);
    return items.map((item, index) => ({
      ...item,
      description:
        lines[index]?.replace(/^[0-9]+[).\-\s]*/, '').trim() ||
        item.description,
    }));
  }

  private async generateConversationalReply(
    message: string,
    lang: ChatLanguage,
    _intent: ChatIntent,
    databaseMiss = false,
  ): Promise<ChatResponse> {
    const systemPrompt =
      lang === 'en'
        ? 'You are a helpful Vietnamese travel consultant. Respond in fluent English with warm, concise recommendations.'
        : 'Bạn là chatbot tư vấn du lịch Việt Nam, hãy trả lời tự nhiên, hữu ích và thân thiện.';

    const userPrompt = databaseMiss
      ? `${message}\n\nDữ liệu hệ thống hiện không có kết quả phù hợp, hãy đưa ra gợi ý chung dựa trên hiểu biết của bạn.`
      : message;

    const response = await this.performModelCall((model) =>
      model.generateContent({
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      }),
    );
    const text =
      this.extractText(response) ||
      'Xin lỗi, tôi chưa thể phản hồi ngay lúc này.';
    return { source: 'ai', text };
  }

  private async classifyMessage(message: string): Promise<Classification> {
    const response = await this.performModelCall((model) =>
      model.generateContent({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: 'Bạn là bộ phân loại truy vấn du lịch. Hãy xác định ý định của người dùng giữa các lựa chọn: destination, restaurant, hotel, service, app_guide, other. Cũng hãy trích xuất tối đa 5 từ khóa chính để tìm kiếm dữ liệu.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Người dùng hỏi: "${message}". Hãy trả lời bằng JSON với cấu trúc {"intent": "...", "keywords": ["..."]}.`,
              },
            ],
          },
        ],
      }),
    );

    const raw = this.extractText(response);
    try {
      const parsed = JSON.parse(raw) as Partial<Classification>;
      return {
        intent: parsed.intent ?? 'other',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      };
    } catch {
      return { intent: 'other', keywords: [] };
    }
  }

  private extractText(result: GenerateContentResult | undefined): string {
    if (!result || !result.response) {
      return '';
    }
    const text = result.response.text();
    if (typeof text === 'string' && text.trim().length) {
      return text.trim();
    }
    const candidates = result.response.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      for (const part of parts) {
        const partText = (part as { text?: string }).text;
        if (partText && partText.trim().length) {
          return partText.trim();
        }
      }
    }
    return '';
  }

  private getModel(): GenerativeModel {
    if (this.generativeModel) {
      return this.generativeModel;
    }
    const apiKey = this.configService.get<string>('GOOGLE_GENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured',
      );
    }
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenerativeAI(apiKey);
    }
    this.generativeModel = this.geminiClient.getGenerativeModel({
      model: this.modelName,
    });
    return this.generativeModel;
  }

  private async performModelCall<T>(
    call: (model: GenerativeModel) => Promise<T>,
  ): Promise<T> {
    const model = this.getModel();
    let retries = 2;
    while (retries > 0) {
      try {
        return await call(model);
      } catch (error) {
        if (this.isRateLimitError(error)) {
          if (--retries === 0) {
            throw new HttpException(
              'Gemini quota exceeded. Vui lòng thử lại sau một lát.',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        if (this.isServiceUnavailableError(error)) {
          throw new ServiceUnavailableException(
            'Gemini hiện đang quá tải. Vui lòng thử lại sau.',
          );
        }
        throw new InternalServerErrorException('Gemini request failed');
      }
    }
    throw new InternalServerErrorException('Gemini request failed');
  }

  private isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const err = error as {
      status?: number;
      message?: string;
      statusText?: string;
      cause?: unknown;
    };
    const message = (err.message ?? '').toLowerCase();
    const statusText = (err.statusText ?? '').toLowerCase();
    let causeMessage = '';
    if (typeof err.cause === 'object' && err.cause && 'message' in err.cause) {
      const nestedMessage = (err.cause as { message?: unknown }).message;
      if (typeof nestedMessage === 'string') {
        causeMessage = nestedMessage.toLowerCase();
      }
    }
    return (
      err.status === 429 ||
      /quota|rate|resourceexhausted/.test(message) ||
      /quota|rate|resourceexhausted/.test(statusText) ||
      /quota|rate|resourceexhausted/.test(causeMessage)
    );
  }

  private isServiceUnavailableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const err = error as {
      status?: number;
      message?: string;
      statusText?: string;
    };
    const message = (err.message ?? '').toLowerCase();
    const statusText = (err.statusText ?? '').toLowerCase();
    return (
      err.status === 503 ||
      /unavailable|internal|backend error/.test(message) ||
      /unavailable|internal|backend error/.test(statusText)
    );
  }

  /*
   * Legacy GPT/OpenAI helpers retained for reference:
   *
   * private client: OpenAI | null = null;
   * private get openai(): OpenAI { ... }
   * private async performOpenAICall<T>(call: () => Promise<T>): Promise<T> { ... }
   */
}
