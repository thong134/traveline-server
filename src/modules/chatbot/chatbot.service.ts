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
import {
  Content,
  GenerateContentResult,
  GenerativeModel,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import axios from 'axios';
import { IsNull, Repository } from 'typeorm';
import { Destination } from '../destination/entities/destinations.entity';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { ChatCache } from './entities/chat-cache.entity';
import { ChatUserProfile } from './entities/chat-user-profile.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../user/entities/user.entity';
import { ChatImageAttachmentDto } from './dto/chat-request.dto';

type ChatIntent =
  | 'destination'
  | 'restaurant'
  | 'hotel'
  | 'service'
  | 'app_guide'
  | 'booking_help'
  | 'transport'
  | 'image_request'
  | 'profile_update'
  | 'other';

type ChatLanguage = 'vi' | 'en';

type Classification = {
  intent: ChatIntent;
  keywords: string[];
  regions: string[];
  categories: string[];
  followUp: boolean;
  imageRequested: boolean;
};

type ChatResultItem = {
  name: string;
  address?: string;
  description?: string;
  type: 'destination' | 'restaurant' | 'hotel';
  images?: string[];
};

type ChatImagePayload = {
  source: 'database' | 'generated' | 'user';
  url?: string;
  base64?: string;
  mimeType?: string;
  caption?: string;
};

type ChatResponse =
  | {
      source: 'database';
      data: ChatResultItem[];
      text?: string;
      images?: ChatImagePayload[];
    }
  | {
      source: 'ai';
      text: string;
      images?: ChatImagePayload[];
    };

type NormalizedImageAttachment = {
  base64: string;
  mimeType: string;
  origin: 'user-base64' | 'user-url';
};

type ChatHandleOptions = {
  userId?: number;
  sessionId?: string;
  images?: ChatImageAttachmentDto[];
};

type ChatRuntimeContext = {
  userId?: number;
  sessionId?: string;
  profile?: ChatUserProfile | null;
  profileSummary?: string;
  history: Content[];
  historyEntities: ChatMessage[];
  attachments: NormalizedImageAttachment[];
};

type RecordMessagePayload = {
  role: 'user' | 'assistant';
  content: string;
  intent: ChatIntent;
  classification?: Classification;
  userId?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

const MAX_SUGGESTION_ITEMS = 3;
const MAX_PROFILE_ENTRIES = 8;
const MAX_RECENT_SEARCHES = 10;

@Injectable()
export class ChatService {
  private readonly modelName = 'gemini-2.5-flash';
  private readonly visionModelName = 'gemini-2.0-flash';
  private readonly historyLimit = 6;
  private readonly modelPool = new Map<string, GenerativeModel>();
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(ChatCache)
    private readonly cacheRepo: Repository<ChatCache>,
    @InjectRepository(ChatUserProfile)
    private readonly profileRepo: Repository<ChatUserProfile>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async handleChat(
    rawMessage: string,
    lang: string | undefined,
    options?: ChatHandleOptions,
  ): Promise<ChatResponse> {
    const message = rawMessage?.trim();
    if (!message) {
      throw new BadRequestException('Message must not be empty');
    }

    const preferredLang: ChatLanguage = lang === 'en' ? 'en' : 'vi';
    const normalizedSessionId = this.normalizeSessionId(
      options?.sessionId,
      options?.userId,
    );
    const attachments = await this.normalizeAttachments(options?.images ?? []);
    const historyEntities = await this.loadRecentMessages(
      options?.userId,
      normalizedSessionId,
    );
    const history = this.mapMessagesToModelHistory(historyEntities);

    const canUseCache =
      attachments.length === 0 &&
      historyEntities.length === 0 &&
      !options?.userId;

    if (canUseCache) {
      const cached = await this.cacheRepo.findOne({
        where: { message, user: IsNull() },
      });
      if (cached) {
        return {
          source: 'ai',
          text: cached.response,
          images: this.extractCachedImages(cached.metadata),
        };
      }
    }

    const profile = options?.userId
      ? await this.getOrCreateProfile(options.userId)
      : null;
    const profileSummary = this.buildProfileSummary(profile);

    const classification = await this.classifyMessage(
      message,
      history,
      profileSummary,
    );
    const enrichedClassification = this.enrichClassificationWithHistory(
      classification,
      historyEntities,
    );

    await this.recordMessage({
      role: 'user',
      content: message,
      intent: enrichedClassification.intent,
      classification: enrichedClassification,
      userId: options?.userId,
      sessionId: normalizedSessionId,
    });

    const context: ChatRuntimeContext = {
      userId: options?.userId,
      sessionId: normalizedSessionId,
      profile,
      profileSummary,
      history,
      historyEntities,
      attachments,
    };

    const response = await this.routeIntent(
      enrichedClassification,
      message,
      preferredLang,
      context,
    );

    await this.recordMessage({
      role: 'assistant',
      content: this.pickResponseText(response),
      intent: enrichedClassification.intent,
      classification: enrichedClassification,
      userId: options?.userId,
      sessionId: normalizedSessionId,
      metadata: {
        source: response.source,
        images: response.images ?? [],
      },
    });

    if (profile) {
      await this.updateProfileFromInteraction(
        profile,
        message,
        enrichedClassification,
      );
    }

    if (response.source === 'ai' && canUseCache) {
      await this.cacheRepo.save(
        this.cacheRepo.create({
          message,
          response: response.text,
          metadata: { images: response.images ?? [] },
        }),
      );
    }

    return response;
  }

  private async routeIntent(
    classification: Classification,
    message: string,
    preferredLang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    switch (classification.intent) {
      case 'destination':
        return this.handleDestinationQuery(
          classification,
          message,
          preferredLang,
          context,
        );
      case 'restaurant':
        return this.handleRestaurantQuery(
          classification,
          message,
          preferredLang,
          context,
        );
      case 'hotel':
        return this.handleHotelQuery(
          classification,
          message,
          preferredLang,
          context,
        );
      case 'image_request':
        return this.handleImageRequest(
          classification,
          message,
          preferredLang,
          context,
        );
      case 'booking_help':
      case 'service':
      case 'app_guide':
      case 'transport':
      case 'profile_update':
      case 'other':
      default:
        return this.generateConversationalReply(
          message,
          preferredLang,
          classification.intent,
          {
            history: context.history,
            profileSummary: context.profileSummary,
            attachments: context.attachments,
          },
        );
    }
  }

  private async handleDestinationQuery(
    classification: Classification,
    fallback: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    const searchTerms = this.buildSearchTerms(
      classification,
      fallback,
      context.profile,
    );
    const results = await this.searchDestinations(searchTerms);
    if (!results.length) {
      return this.generateConversationalReply(fallback, lang, 'destination', {
        history: context.history,
        profileSummary: context.profileSummary,
        attachments: context.attachments,
        databaseMiss: true,
      });
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
      images: destination.photos.slice(0, MAX_SUGGESTION_ITEMS),
    }));

    const summary = this.buildSummaryText('dia diem du lich', mapped, 'vi');
    const translatedSummary = await this.translateIfNeeded(summary, lang);

    const images = await this.prepareImagePayloads(
      mapped.flatMap((item) => item.images ?? []),
      'destination',
    );

    return {
      source: 'database',
      data:
        lang === 'en'
          ? await this.translateEntries(mapped, 'destination')
          : mapped,
      text: lang === 'en' ? (translatedSummary ?? summary) : summary,
      images,
    };
  }

  private async handleRestaurantQuery(
    classification: Classification,
    fallback: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    const searchTerms = this.buildSearchTerms(
      classification,
      fallback,
      context.profile,
    );
    const cooperations = await this.searchCooperations(
      'restaurant',
      searchTerms,
    );
    if (!cooperations.length) {
      return this.generateConversationalReply(fallback, lang, 'restaurant', {
        history: context.history,
        profileSummary: context.profileSummary,
        attachments: context.attachments,
        databaseMiss: true,
      });
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
      images: coop.photo ? [coop.photo] : [],
    }));

    const summary = this.buildSummaryText('nha hang goi y', mapped, 'vi');
    const translatedSummary = await this.translateIfNeeded(summary, lang);
    const images = await this.prepareImagePayloads(
      mapped.flatMap((item) => item.images ?? []),
      'restaurant',
    );

    return {
      source: 'database',
      data:
        lang === 'en'
          ? await this.translateEntries(mapped, 'restaurant')
          : mapped,
      text: lang === 'en' ? (translatedSummary ?? summary) : summary,
      images,
    };
  }

  private async handleHotelQuery(
    classification: Classification,
    fallback: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    const searchTerms = this.buildSearchTerms(
      classification,
      fallback,
      context.profile,
    );
    const cooperations = await this.searchCooperations('hotel', searchTerms);
    if (!cooperations.length) {
      return this.generateConversationalReply(fallback, lang, 'hotel', {
        history: context.history,
        profileSummary: context.profileSummary,
        attachments: context.attachments,
        databaseMiss: true,
      });
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
      images: coop.photo ? [coop.photo] : [],
    }));

    const summary = this.buildSummaryText('khach san goi y', mapped, 'vi');
    const translatedSummary = await this.translateIfNeeded(summary, lang);
    const images = await this.prepareImagePayloads(
      mapped.flatMap((item) => item.images ?? []),
      'hotel',
    );

    return {
      source: 'database',
      data:
        lang === 'en' ? await this.translateEntries(mapped, 'hotel') : mapped,
      text: lang === 'en' ? (translatedSummary ?? summary) : summary,
      images,
    };
  }

  private async handleImageRequest(
    classification: Classification,
    message: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    if (context.attachments.length) {
      const analysis = await this.describeUserImages(context.attachments, lang);
      return {
        source: 'ai',
        text: analysis,
        images: this.attachmentsToResponse(context.attachments),
      };
    }

    const destinationIntent: Classification = {
      ...classification,
      intent:
        classification.intent === 'image_request'
          ? 'destination'
          : classification.intent,
    };
    const searchTerms = this.buildSearchTerms(
      destinationIntent,
      message,
      context.profile,
    );
    const results = await this.searchDestinations(searchTerms);
    if (!results.length) {
      return this.generateConversationalReply(message, lang, 'image_request', {
        history: context.history,
        profileSummary: context.profileSummary,
        databaseMiss: true,
      });
    }

    const images = results
      .flatMap((destination) => destination.photos)
      .slice(0, MAX_SUGGESTION_ITEMS);

    if (!images.length) {
      return this.generateConversationalReply(message, lang, 'image_request', {
        history: context.history,
        profileSummary: context.profileSummary,
        databaseMiss: true,
      });
    }

    const preparedImages = await this.prepareImagePayloads(
      images,
      'destination',
    );

    const caption = await this.generateImageSetCaption(images, lang, message);
    return {
      source: 'ai',
      text: caption,
      images: preparedImages,
    };
  }

  private async searchDestinations(terms: string[]): Promise<Destination[]> {
    if (!terms.length) {
      return [];
    }

    const qb = this.destinationRepo.createQueryBuilder('destination');
    const clauses: string[] = [];
    terms.forEach((term, index) => {
      const key = `kw${index}`;
      clauses.push(
        `(destination.name ILIKE :${key} OR destination.province ILIKE :${key} OR COALESCE(destination.descriptionViet, '') ILIKE :${key} OR COALESCE(destination.descriptionEng, '') ILIKE :${key})`,
      );
      qb.setParameter(key, `%${term}%`);
    });
    qb.where(clauses.join(' OR '));

    return qb
      .orderBy('destination.favouriteTimes', 'DESC')
      .take(MAX_SUGGESTION_ITEMS)
      .getMany();
  }

  private async searchCooperations(
    type: 'restaurant' | 'hotel',
    terms: string[],
  ): Promise<Cooperation[]> {
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

    return qb
      .orderBy('cooperation.bookingTimes', 'DESC')
      .take(MAX_SUGGESTION_ITEMS)
      .getMany();
  }

  private buildSearchTerms(
    classification: Classification,
    fallback: string,
    profile?: ChatUserProfile | null,
  ): string[] {
    const source = new Set<string>();
    classification.keywords.forEach((kw) => source.add(kw));
    classification.regions.forEach((region) => source.add(region));

    if (profile) {
      profile.preferredRegions
        .slice(0, 2)
        .forEach((region) => source.add(region));
      if (classification.intent === 'destination') {
        profile.preferredThemes
          .slice(0, 2)
          .forEach((theme) => source.add(theme));
      }
    }

    if (!source.size && fallback.trim()) {
      source.add(fallback);
    }

    return Array.from(source)
      .map((term) => term.trim())
      .filter((term) => term.length > 0)
      .slice(0, 5);
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
            `${index + 1}. ${item.name}${
              item.address ? ` - ${item.address}` : ''
            }`,
        )
        .join('\n');
    }
    const header = `Day la mot vai ${kind} ban co the tham khao:`;
    const bullet = items
      .map((item) => {
        const address = item.address ? `, dia chi: ${item.address}` : '';
        const description = item.description
          ? `. Goi y: ${item.description}`
          : '';
        return `- ${item.name}${address}${description}`;
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
              text: 'You translate Vietnamese travel recommendations into natural English. Keep numbering or bullet formats when present.',
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
              text: 'Translate the following Vietnamese descriptions into concise English. Preserve numbering and return only the translated lines.',
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
    intent: ChatIntent,
    options: {
      history?: Content[];
      profileSummary?: string;
      attachments?: NormalizedImageAttachment[];
      databaseMiss?: boolean;
    } = {},
  ): Promise<ChatResponse> {
    const systemPrompt =
      lang === 'en'
        ? 'You are a friendly Vietnamese travel consultant. Provide concise and helpful answers in English.'
        : 'Ban la tro ly du lich Viet Nam, hay tra loi chan thanh, ngan gon va huu ich.';

    const profileInstruction = options.profileSummary
      ? `\nUser preferences: ${options.profileSummary}.`
      : '';
    const intentInstruction = `\nCurrent intent: ${intent}.`;

    const userPrompt =
      (options.databaseMiss
        ? `${message}\n\nNo direct match was found in our database. Please offer a generic but useful travel tip.`
        : message) +
      profileInstruction +
      intentInstruction;

    const history = options.history ?? [];
    const parts = [
      ...(options.attachments?.map((attachment) => ({
        inlineData: { data: attachment.base64, mimeType: attachment.mimeType },
      })) ?? []),
      { text: userPrompt },
    ];

    const response = await this.performModelCall(
      (model) =>
        model.generateContent({
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemPrompt }],
          },
          contents: [...history, { role: 'user', parts }],
        }),
      this.modelName,
    );
    const text =
      this.extractText(response) ||
      (lang === 'en'
        ? 'Sorry, I could not generate an answer just yet.'
        : 'Xin loi, hien tai toi chua the phan hoi.');
    return { source: 'ai', text };
  }

  private async classifyMessage(
    message: string,
    history: Content[],
    profileSummary?: string,
  ): Promise<Classification> {
    const historySnippet = history
      .slice(-4)
      .map(
        (entry) =>
          `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.parts
            .map((part) => part.text ?? '')
            .join(' ')}`,
      )
      .join('\n');

    const contextPrompt = historySnippet
      ? `\nRecent conversation:\n${historySnippet}`
      : '';
    const profilePrompt = profileSummary
      ? `\nKnown preferences: ${profileSummary}`
      : '';

    const response = await this.performModelCall((model) =>
      model.generateContent({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: 'Classify the travel intent of the user. Valid intents: destination, restaurant, hotel, service, app_guide, booking_help, transport, image_request, profile_update, other. Extract up to five keywords, regions, and categories for searching. If the question continues a previous turn set followUp to true. If the user requests images set imageRequested to true. Reply ONLY with JSON {"intent":string,"keywords":string[],"regions":string[],"categories":string[],"followUp":boolean,"imageRequested":boolean}.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `User query: "${message}".${contextPrompt}${profilePrompt}`,
              },
            ],
          },
        ],
      }),
    );

    const raw = this.extractText(response);
    try {
      const parsedValue: unknown = raw ? JSON.parse(raw) : null;
      if (!this.isRecord(parsedValue)) {
        throw new Error('Invalid classification payload');
      }
      const parsedRecord = parsedValue;
      return {
        intent: this.normalizeIntent(
          this.asOptionalString(parsedRecord.intent),
        ),
        keywords: this.asStringArray(parsedRecord.keywords),
        regions: this.asStringArray(parsedRecord.regions),
        categories: this.asStringArray(parsedRecord.categories),
        followUp: this.asBoolean(parsedRecord.followUp),
        imageRequested: this.asBoolean(parsedRecord.imageRequested),
      };
    } catch {
      return {
        intent: 'other',
        keywords: [],
        regions: [],
        categories: [],
        followUp: false,
        imageRequested: false,
      };
    }
  }

  private normalizeIntent(intent?: string): ChatIntent {
    switch (intent) {
      case 'destination':
      case 'restaurant':
      case 'hotel':
      case 'service':
      case 'app_guide':
      case 'booking_help':
      case 'transport':
      case 'image_request':
      case 'profile_update':
        return intent;
      default:
        return 'other';
    }
  }

  private enrichClassificationWithHistory(
    classification: Classification,
    history: ChatMessage[],
  ): Classification {
    if (!classification.followUp) {
      return classification;
    }

    const historyCopy = [...history].reverse();
    const lastRelevant = historyCopy.find(
      (msg) => msg.role === 'user' && msg.intent && msg.metadata,
    );

    if (lastRelevant?.metadata) {
      const previous = lastRelevant.metadata as {
        classification?: Classification;
      };
      if (previous?.classification) {
        return {
          intent:
            classification.intent === 'other'
              ? previous.classification.intent
              : classification.intent,
          keywords: classification.keywords.length
            ? classification.keywords
            : previous.classification.keywords,
          regions: classification.regions.length
            ? classification.regions
            : previous.classification.regions,
          categories: classification.categories.length
            ? classification.categories
            : previous.classification.categories,
          followUp: true,
          imageRequested:
            classification.imageRequested ||
            previous.classification.imageRequested,
        };
      }
    }

    return classification;
  }

  private async describeUserImages(
    attachments: NormalizedImageAttachment[],
    lang: ChatLanguage,
  ): Promise<string> {
    const systemPrompt =
      lang === 'en'
        ? 'You are a travel assistant describing user supplied photos. Provide a concise summary in English.'
        : 'Ban la tro ly du lich mo ta anh do nguoi dung cung cap. Viet cau ngan gon bang tieng Viet khong dau.';

    const response = await this.performModelCall(
      (model) =>
        model.generateContent({
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                ...attachments.map((attachment) => ({
                  inlineData: {
                    data: attachment.base64,
                    mimeType: attachment.mimeType,
                  },
                })),
                {
                  text: 'Describe what is happening in the images and provide relevant travel suggestions if possible.',
                },
              ],
            },
          ],
        }),
      this.visionModelName,
    );

    return (
      this.extractText(response) ||
      (lang === 'en'
        ? 'These photos look great. Let me know if you need suggestions related to them.'
        : 'Day la mot so hinh anh rat dep. Hay cho toi biet ban muon goi y gi them.')
    );
  }

  private attachmentsToResponse(
    attachments: NormalizedImageAttachment[],
  ): ChatImagePayload[] {
    return attachments.map((attachment) => ({
      source: 'user',
      base64: attachment.base64,
      mimeType: attachment.mimeType,
    }));
  }

  private async generateImageSetCaption(
    imageUrls: string[],
    lang: ChatLanguage,
    query: string,
  ): Promise<string> {
    const response = await this.performModelCall((model) =>
      model.generateContent({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text:
                lang === 'en'
                  ? 'Write a short friendly sentence that introduces a set of travel photos sourced from our recommendation library.'
                  : 'Viet mot cau ngan gon gioi thieu bo anh du lich tu thu vien goi y.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `User request: ${query}\nNumber of photos: ${imageUrls.length}`,
              },
            ],
          },
        ],
      }),
    );

    return (
      this.extractText(response) ||
      (lang === 'en'
        ? 'Here are some photos that match your request.'
        : 'Day la mot vai hinh anh phu hop voi yeu cau cua ban.')
    );
  }

  private async prepareImagePayloads(
    urls: string[],
    sourceCategory: 'destination' | 'restaurant' | 'hotel',
  ): Promise<ChatImagePayload[]> {
    const uniqueUrls = Array.from(new Set(urls)).slice(0, MAX_SUGGESTION_ITEMS);
    return Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const { base64, mimeType } = await this.fetchImageAsBase64(url);
          return {
            source: 'database' as const,
            url,
            base64,
            mimeType,
            caption:
              sourceCategory === 'destination'
                ? 'Database destination photo'
                : sourceCategory === 'restaurant'
                  ? 'Database restaurant photo'
                  : 'Database hotel photo',
          };
        } catch {
          return {
            source: 'database' as const,
            url,
          };
        }
      }),
    );
  }

  private async normalizeAttachments(
    attachments: ChatImageAttachmentDto[],
  ): Promise<NormalizedImageAttachment[]> {
    const normalized: NormalizedImageAttachment[] = [];
    for (const attachment of attachments.slice(0, 3)) {
      if (attachment.type === 'base64') {
        normalized.push(this.convertBase64Attachment(attachment));
      } else if (attachment.type === 'url') {
        const converted = await this.convertUrlAttachment(attachment);
        if (converted) {
          normalized.push(converted);
        }
      }
    }
    return normalized;
  }

  private convertBase64Attachment(
    attachment: ChatImageAttachmentDto,
  ): NormalizedImageAttachment {
    const raw = attachment.data.trim();
    const match = raw.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    const base64 = match ? match[2] : raw;
    if (!this.isBase64(base64)) {
      throw new BadRequestException('Invalid image payload.');
    }
    const mimeType = attachment.mimeType ?? (match ? match[1] : 'image/jpeg');
    return {
      base64,
      mimeType,
      origin: 'user-base64',
    };
  }

  private async convertUrlAttachment(
    attachment: ChatImageAttachmentDto,
  ): Promise<NormalizedImageAttachment | null> {
    try {
      const { base64, mimeType } = await this.fetchImageAsBase64(
        attachment.data,
      );
      return {
        base64,
        mimeType,
        origin: 'user-url',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Unable to fetch image from provided URL.');
    }
  }

  private async fetchImageAsBase64(
    url: string,
  ): Promise<{ base64: string; mimeType: string }> {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const mimeTypeRaw =
        typeof response.headers.get === 'function'
          ? response.headers.get('content-type')
          : undefined;
      const mimeTypeHeader = Array.isArray(mimeTypeRaw)
        ? mimeTypeRaw[0]
        : (mimeTypeRaw ?? undefined);
      const mimeType =
        typeof mimeTypeHeader === 'string' &&
        mimeTypeHeader.startsWith('image/')
          ? mimeTypeHeader
          : 'image/jpeg';
      const base64 = Buffer.from(response.data).toString('base64');
      return { base64, mimeType };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          'Failed to download image.',
          error.response?.status ?? HttpStatus.BAD_REQUEST,
        );
      }
      throw new InternalServerErrorException('Failed to download image.');
    }
  }

  private isBase64(payload: string): boolean {
    try {
      return Buffer.from(payload, 'base64').toString('base64') === payload;
    } catch {
      return false;
    }
  }

  private mapMessagesToModelHistory(messages: ChatMessage[]): Content[] {
    return messages.slice(-this.historyLimit).map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
  }

  private async loadRecentMessages(
    userId?: number,
    sessionId?: string,
  ): Promise<ChatMessage[]> {
    if (!userId && !sessionId) {
      return [];
    }
    const qb = this.messageRepo
      .createQueryBuilder('message')
      .orderBy('message.createdAt', 'ASC')
      .take(this.historyLimit * 2);

    if (userId) {
      qb.where('message.user_id = :userId', { userId });
    } else if (sessionId) {
      qb.where('message.sessionId = :sessionId', { sessionId });
    }

    return qb.getMany();
  }

  private async recordMessage(payload: RecordMessagePayload): Promise<void> {
    await this.messageRepo.save(
      this.messageRepo.create({
        role: payload.role,
        content: payload.content,
        intent: payload.intent,
        user: payload.userId
          ? await this.userRepo.findOne({ where: { id: payload.userId } })
          : null,
        sessionId: payload.sessionId ?? null,
        metadata: {
          ...(payload.metadata ?? {}),
          ...(payload.classification
            ? { classification: payload.classification }
            : {}),
        },
      }),
    );
  }

  private pickResponseText(response: ChatResponse): string {
    if (response.source === 'ai') {
      return response.text;
    }
    if (response.text && response.text.trim().length) {
      return response.text;
    }
    const items = response.data
      .map((item) => `${item.name}${item.address ? ` - ${item.address}` : ''}`)
      .join('\n');
    return items || 'No response generated.';
  }

  private normalizeSessionId(
    sessionId?: string,
    userId?: number,
  ): string | undefined {
    if (userId) {
      return `user-${userId}`;
    }
    if (!sessionId) {
      return undefined;
    }
    const trimmed = sessionId.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  }

  private buildProfileSummary(
    profile: ChatUserProfile | null,
  ): string | undefined {
    if (!profile) {
      return undefined;
    }
    const parts: string[] = [];
    if (profile.preferredRegions.length) {
      parts.push(`regions: ${profile.preferredRegions.slice(0, 3).join(', ')}`);
    }
    if (profile.preferredThemes.length) {
      parts.push(`themes: ${profile.preferredThemes.slice(0, 3).join(', ')}`);
    }
    if (profile.recentSearches.length) {
      parts.push(
        `recent searches: ${profile.recentSearches.slice(0, 3).join(', ')}`,
      );
    }
    return parts.length ? parts.join('; ') : undefined;
  }

  private async getOrCreateProfile(userId: number): Promise<ChatUserProfile> {
    const existing = await this.profileRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    if (existing) {
      return existing;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const created = this.profileRepo.create({
      user,
      preferredRegions: [],
      preferredThemes: [],
      recentSearches: [],
      metadata: {},
    });
    const saved = await this.profileRepo.save(created);
    return this.profileRepo.findOneOrFail({ where: { id: saved.id } });
  }

  private async updateProfileFromInteraction(
    profile: ChatUserProfile,
    message: string,
    classification: Classification,
  ): Promise<void> {
    const regions = this.mergePreferenceList(
      profile.preferredRegions,
      classification.regions,
      MAX_PROFILE_ENTRIES,
    );
    const themes = this.mergePreferenceList(
      profile.preferredThemes,
      classification.categories,
      MAX_PROFILE_ENTRIES,
    );
    const searches = this.updateRecentSearches(
      profile.recentSearches,
      classification,
      message,
    );

    const updates: Partial<ChatUserProfile> = {};
    if (this.hasArrayChanged(profile.preferredRegions, regions)) {
      updates.preferredRegions = regions;
    }
    if (this.hasArrayChanged(profile.preferredThemes, themes)) {
      updates.preferredThemes = themes;
    }
    if (this.hasArrayChanged(profile.recentSearches, searches)) {
      updates.recentSearches = searches;
    }

    if (Object.keys(updates).length) {
      await this.profileRepo.save({
        ...profile,
        ...updates,
      });
      Object.assign(profile, updates);
    }
  }

  private mergePreferenceList(
    current: string[],
    additions: string[],
    limit: number,
  ): string[] {
    const normalized = additions
      .map((item) => item.trim())
      .filter((item) => item.length);
    if (!normalized.length) {
      return current;
    }
    const merged: string[] = [];
    const pushUnique = (value: string) => {
      const lowered = value.toLowerCase();
      if (!merged.some((existing) => existing.toLowerCase() === lowered)) {
        merged.push(value);
      }
    };
    normalized.forEach(pushUnique);
    current.forEach(pushUnique);
    return merged.slice(0, limit);
  }

  private updateRecentSearches(
    current: string[],
    classification: Classification,
    message: string,
  ): string[] {
    const additions = [...classification.keywords, ...classification.regions]
      .map((item) => item.trim())
      .filter((item) => item.length);

    if (!additions.length && message.trim()) {
      additions.push(message.trim().slice(0, 64));
    }

    const merged = [...additions, ...current];
    const seen = new Set<string>();
    const deduped = merged.filter((item) => {
      const lowered = item.toLowerCase();
      if (seen.has(lowered)) {
        return false;
      }
      seen.add(lowered);
      return true;
    });

    return deduped.slice(0, MAX_RECENT_SEARCHES);
  }

  private hasArrayChanged<T>(current: T[], next: T[]): boolean {
    if (current.length !== next.length) {
      return true;
    }
    return current.some((value, index) => value !== next[index]);
  }

  private extractCachedImages(
    metadata?: Record<string, unknown>,
  ): ChatImagePayload[] | undefined {
    const images = metadata?.images;
    if (!Array.isArray(images)) {
      return undefined;
    }
    return images
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item) => ({
        source: (item.source as ChatImagePayload['source']) ?? 'database',
        url: typeof item.url === 'string' ? item.url : undefined,
        base64: typeof item.base64 === 'string' ? item.base64 : undefined,
        mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
        caption: typeof item.caption === 'string' ? item.caption : undefined,
      }));
  }

  private async performModelCall(
    call: (model: GenerativeModel) => Promise<GenerateContentResult>,
    modelName = this.modelName,
  ): Promise<GenerateContentResult> {
    try {
      const model = this.getModel(modelName);
      return await call(model);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new ServiceUnavailableException('Gemini service is unavailable.');
    }
  }

  private getModel(modelName: string): GenerativeModel {
    const cached = this.modelPool.get(modelName);
    if (cached) {
      return cached;
    }
    const client = this.ensureGeminiClient();
    const model = client.getGenerativeModel({ model: modelName });
    this.modelPool.set(modelName, model);
    return model;
  }

  private ensureGeminiClient(): GoogleGenerativeAI {
    if (this.geminiClient) {
      return this.geminiClient;
    }
    const apiKey =
      this.configService.get<string>('gemini.apiKey') ??
      this.configService.get<string>('services.gemini.apiKey') ??
      process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Gemini API key is not configured.',
      );
    }
    this.geminiClient = new GoogleGenerativeAI(apiKey);
    return this.geminiClient;
  }

  private extractText(result: GenerateContentResult | undefined): string {
    if (!result) {
      return '';
    }
    const candidates = result.response?.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      for (const part of parts) {
        if (part.text) {
          return part.text.trim();
        }
      }
    }
    return '';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private asOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }

  private asBoolean(value: unknown): boolean {
    return value === true;
  }
}
