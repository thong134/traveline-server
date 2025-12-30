import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Content,
  GenerateContentResult,
  GenerativeModel,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import { In, IsNull, Repository } from 'typeorm';
import { Destination } from '../destination/entities/destinations.entity';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { ChatCache } from './entities/chat-cache.entity';
import { ChatUserProfile } from './entities/chat-user-profile.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../user/entities/user.entity';
import { TravelRoute } from '../travel-route/entities/travel-route.entity';
import { RouteStop } from '../travel-route/entities/route-stop.entity';
import { BusType } from '../bus/bus/entities/bus-type.entity';
import { TrainRoute } from '../train/train/entities/train-route.entity';
import { Flight } from '../flight/flight/entities/flight.entity';
import { ChatImageAttachmentDto } from './dto/chat-request.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { RentalBillsService } from '../rental-bill/rental-bill.service';
import { RentalVehiclesService } from '../rental-vehicle/rental-vehicle.service';
import { TravelRoutesService } from '../travel-route/travel-route.service';
import { CooperationsService } from '../cooperation/cooperation.service';
import { RentalBillStatus, RentalProgressStatus } from '../rental-bill/entities/rental-bill.entity';
import { RentalType } from '../rental-vehicle/dto/search-rental-vehicle.dto';

type ChatIntent =
  | 'destination'
  | 'restaurant'
  | 'hotel'
  | 'service'
  | 'app_guide'
  | 'booking_help'
  | 'transport'
  | 'image_request'
  | 'image_classify'
  | 'profile_update'
  | 'route_query'
  | 'route_detail'
  | 'transport_search'
  | 'my_orders'
  | 'my_routes'
  | 'search_vehicle'
  | 'search_hotel'
  | 'search_restaurant'
  | 'create_route'
  | 'greeting'
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
  id?: number; // For frontend linking
  name: string;
  address?: string;
  description?: string;
  type: 'destination' | 'restaurant' | 'hotel';
  images?: string[];
  categories?: string[]; // For image classification results
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
      text?: string | { opening: string; closing: string };
      images?: ChatImagePayload[];
    }
  | {
      source: 'ai';
      text: string | { opening: string; closing: string };
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
  private readonly visionModelName = 'gemini-2.5-flash';
  private readonly historyLimit = 6;
  private readonly modelPool = new Map<string, GenerativeModel>();
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cloudinaryService: CloudinaryService,
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
    @InjectRepository(TravelRoute)
    private readonly routeRepo: Repository<TravelRoute>,
    @InjectRepository(RouteStop)
    private readonly stopRepo: Repository<RouteStop>,
    @InjectRepository(BusType)
    private readonly busRepo: Repository<BusType>,
    @InjectRepository(TrainRoute)
    private readonly trainRepo: Repository<TrainRoute>,
    @InjectRepository(Flight)
    private readonly flightRepo: Repository<Flight>,
    private readonly rentalBillsService: RentalBillsService,
    private readonly rentalVehiclesService: RentalVehiclesService,
    private readonly travelRoutesService: TravelRoutesService,
    private readonly cooperationsService: CooperationsService,
  ) {}

  async handleDestinationSearchApi(
    message: string,
    lang: string | undefined,
    userId: number,
  ): Promise<any> {
    const preferredLang: ChatLanguage = lang === 'en' ? 'en' : 'vi';
    const profile = await this.getOrCreateProfile(userId);
    const profileSummary = this.buildProfileSummary(profile);
    const history: Content[] = []; // No history for this focused search

    // 1. Classify to extract regions/keywords
    const classification = await this.classifyMessage(
      message,
      history,
      profileSummary,
    );


    // 3. Fallback / Generic Search
    // ... Existing logic ...
    const searchTerms = this.buildSearchTerms(
      classification,
      message, // Use message as fallback
      profile,
    );

    // 3. Search DB (returns Destination[])
    const provinceFilter = classification.regions?.[0];
    const results = await this.searchDestinations(searchTerms, provinceFilter);

    // 4. Generate AI Summary (Opening & Closing)
    let opening = '';
    let closing = '';

    if (results.length > 0) {
      const itemsInfo = results
        .map((d, i) => `${i + 1}. ${d.name} (${d.province})`)
        .join('\n');

      try {
        const prompt = preferredLang === 'en'
          ? `User query: "${message}". Found these places:\n${itemsInfo}\n\nGenerate a friendly Opening sentence (e.g., "Here are some great suggestions...") and a Closing sentence (e.g., "Would you like to book a hotel nearby?").\nReply ONLY with JSON: {"opening": "...", "closing": "..."}`
          : `Người dùng hỏi: "${message}". Tìm thấy:\n${itemsInfo}\n\n Hãy viết một câu Mở đầu thân thiện (ví dụ: "Mình tìm thấy vài địa điểm thú vị...") và một câu Kết thúc gợi mở (ví dụ: "Bạn có muốn xem khách sạn gần đó không?").\nTrả lời CHỈ bằng JSON: {"opening": "...", "closing": "..."}`;

        const response = await this.performModelCall(
          (model) => model.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
          }),
          this.modelName,
        );
        
        const raw = this.extractText(response);
        const json = JSON.parse(raw);
        opening = json.opening;
        closing = json.closing;
      } catch (e) {
        // FALLBACK: Static text if AI fails
        console.warn('AI Summary failed, using fallback:', e.message);
        opening = preferredLang === 'en' ? "Here are the top places I found for you:" : "Dưới đây là những địa điểm hàng đầu mình tìm được cho bạn:";
        closing = preferredLang === 'en' ? "Do you want to see details for any of them?" : "Bạn có muốn xem chi tiết địa điểm nào không?";
      }
    } else {
       opening = preferredLang === 'en' 
         ? "I couldn't find any matching destinations." 
         : "Mình tiếc quá, không tìm thấy địa điểm nào phù hợp.";
       closing = preferredLang === 'en' 
         ? "Could you try different keywords?" 
         : "Bạn thử dùng từ khóa khác xem sao nhé?";
    }

    // 5. Return Structured Response
    return {
      source: 'database',
      data: results, // Frontend renders "Content" from this
      text: {
        opening,
        closing
      },
    };
  }

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

    const isGreeting = this.isSimpleGreeting(message);
    const canUseCache =
      attachments.length === 0 &&
      historyEntities.length === 0 &&
      (isGreeting || !options?.userId);

    if (canUseCache) {
      const cached = await this.cacheRepo.findOne({
        where: { message },
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

    // If images are attached, bypass AI classification to save quota
    // and directly assign 'image_classify' intent.
    let classification: Classification;
    if (attachments.length > 0) {
      classification = {
        intent: 'image_classify',
        keywords: [],
        regions: [],
        categories: [],
        followUp: false,
        imageRequested: false,
      };
    } else if (isGreeting) {
      classification = {
        intent: 'other',
        keywords: [],
        regions: [],
        categories: [],
        followUp: false,
        imageRequested: false,
      };
    } else {
      classification = await this.classifyMessage(
        message,
        history,
        profileSummary,
      );
    }

    // 2. ROUTER Based on Intent (Unified Agent Logic)
    if (options?.userId) {
        switch (classification.intent) {
            case 'my_orders':
                return this.handleMyOrders(options.userId, message, preferredLang);
            case 'my_routes':
                return this.handleMyRoutes(options.userId, message, preferredLang);
            case 'search_vehicle':
                return this.handleVehicleSearch(options.userId, message, preferredLang);
            case 'search_hotel':
                return this.handleExternalSearch(options.userId, message, preferredLang, 'HOTEL');
            case 'search_restaurant':
                return this.handleExternalSearch(options.userId, message, preferredLang, 'RESTAURANT');
            case 'create_route':
                return this.handleCreateRoute(options.userId, message, preferredLang);
        }
    }

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
          response: typeof response.text === 'string' 
            ? response.text 
            : (response.text?.opening + '\n' + response.text?.closing) || '',
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
    // Auto-detect image classification when user uploads image
    if (context.attachments.length > 0 && classification.intent !== 'image_request') {
      return this.handleImageClassification(
        classification,
        message,
        preferredLang,
        context,
      );
    }

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
      case 'image_classify':
        return this.handleImageClassification(
          classification,
          message,
          preferredLang,
          context,
        );
      case 'profile_update':
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
      case 'route_query':
        return this.handleRouteQuery(
          classification,
          message,
          preferredLang,
          context,
        );
      case 'route_detail':
        return this.handleRouteDetail(
          classification,
          message,
          preferredLang,
          context,
        );
      case 'transport_search':
        return this.handleTransportSearch(
          classification,
          message,
          preferredLang,
          context,
        );
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
    const provinceFilter = classification.regions?.[0];
    const results = await this.searchDestinations(searchTerms, provinceFilter);
    if (!results.length) {
      return this.generateConversationalReply(fallback, lang, 'destination', {
        history: context.history,
        profileSummary: context.profileSummary,
        attachments: context.attachments,
        databaseMiss: true,
      });
    }

    const mapped = results.map((destination) => ({
      id: destination.id,
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
      id: coop.id,
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
      id: coop.id,
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

  // AI Image Class to Vietnamese Category mapping
  private readonly aiClassToCategoryMap: Record<string, string[]> = {
    'forest': ['Thiên nhiên', 'Rừng'],
    'architecture_site': ['Lịch sử', 'Công trình'],
    'urban_life': ['Giải trí', 'Văn hóa', 'Thành phố'],
    'beach': ['Biển'],
    'mountain': ['Núi'],
  };

  private async handleImageClassification(
    classification: Classification,
    message: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    if (!context.attachments.length) {
      return this.generateConversationalReply(message, lang, 'image_classify', {
        history: context.history,
        profileSummary: context.profileSummary,
        databaseMiss: true,
      });
    }

    // 1. Check for "Identify" intent (e.g. "Đây là đâu?", "Where is this?")
    // If user wants to identify the specific location, we return the standard "Hard to recognize" message.
    const identifyKeywordsLower = lang === 'en' 
        ? ['where is', 'what is this', 'identify', 'location name']
        : ['đây là đâu', 'chỗ nào', 'tên là gì', 'địa điểm nào'];
    const msgLower = message.toLowerCase();
    
    // Only block if SHORT query asking for ID (to avoid blocking "Tìm chỗ giống này nhưng ở đâu đẹp")
    // Simple heuristic: if contains key phrases.
    const isIdentifyRequest = identifyKeywordsLower.some(kw => msgLower.includes(kw));

    if (isIdentifyRequest) {
        return {
            source: 'ai',
            text: lang === 'en' 
                ? "It's a bit hard to recognize the exact location from this image. However, I can look for similar places if you'd like!"
                : "Nhìn hình này hơi khó để nhận biết chính xác địa điểm. Tuy nhiên mình có thể tìm các địa điểm có khung cảnh tương tự nhé!",
            images: this.attachmentsToResponse(context.attachments)
        };
    }

    try {
      const attachment = context.attachments[0];
      
      // Step 1: Upload to Cloudinary
      // Optimize: If it's already a URL from user (unlikely in this flow), skip
      let imageUrl = '';
      if (attachment.origin === 'user-url' && attachment.base64.startsWith('http')) {
          imageUrl = attachment.base64;
      } else {
        const uploadResult = await this.cloudinaryService.uploadBase64Image(
            `data:${attachment.mimeType};base64,${attachment.base64}`,
            'chatbot_images',
        );
        imageUrl = uploadResult.secure_url;
      }

      // Step 2: Call AI service
      const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
      
      let classifiedCategory = 'urban_life';
      try {
        const classifyResponse = await firstValueFrom(
          this.httpService.post(`${aiServiceUrl}/vision/classify`, { imageUrl }),
        );
        classifiedCategory = classifyResponse.data?.class || classifyResponse.data?.predicted_class || 'urban_life';
      } catch (aiError) {
        console.warn('[Chatbot] AI classification failed, using fallback.');
        if (msgLower.includes('biển') || msgLower.includes('beach')) classifiedCategory = 'beach';
        else if (msgLower.includes('núi') || msgLower.includes('mountain')) classifiedCategory = 'mountain';
      }
      
      // Step 3: Map to Categories
      const targetCategories = this.aiClassToCategoryMap[classifiedCategory] || ['Thiên nhiên'];

      // Step 4: Search DB
      const destinations = await this.findDestinationsByCategories(
        targetCategories,
        context.profile,
      );

      if (!destinations.length) {
        return {
          source: 'ai',
          text: lang === 'en'
            ? `It looks like a ${classifiedCategory} scene, but I couldn't find similar places nearby.`
            : `Ảnh này nhìn giống cảnh ${classifiedCategory}, nhưng tiếc là mình chưa tìm thấy địa điểm tương tự trong hệ thống.`,
          images: [{ source: 'user', url: imageUrl }],
        };
      }

      const mapped: ChatResultItem[] = destinations.slice(0, 5).map((dest) => ({
        id: dest.id,
        name: dest.name,
        address: this.joinAddress([dest.province]), // Simple address
        type: 'destination' as const,
        images: dest.photos.slice(0, 1),
        categories: dest.categories,
      }));

      // Step 5: Generate Structure Response (Opening/Closing)
      // Use fallback if AI is overloaded
      
      let opening = '';
      let closing = '';
      
      try {
          // Attempt AI Generation
          const prompt = lang === 'en'
            ? `User uploaded an image of "${classifiedCategory}". Found ${mapped.length} similar places: ${mapped.map(d=>d.name).join(', ')}. Generate Opening (e.g. "Great photo! Here are similar places:") and Closing (e.g. "Want to see more?"). JSON: {"opening": "...", "closing": "..."}`
            : `Người dùng gửi ảnh cảnh "${classifiedCategory}". Tìm thấy ${mapped.length} nơi tương tự: ${mapped.map(d=>d.name).join(', ')}. Tạo câu Mở đầu (vd: "Ảnh đẹp quá! Đây là mấy chỗ tương tự:") và Kết thúc (vd: "Bạn thích chỗ nào không?"). JSON: {"opening": "...", "closing": "..."}`;
            
          const response = await this.performModelCall(
            (model) => model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            }),
            this.modelName,
          );
          const json = JSON.parse(this.extractText(response));
          opening = json.opening;
          closing = json.closing;
      } catch (e) {
          // Fallback if AI fails (Overloaded)
          opening = lang === 'en' 
            ? `Your photo looks like a ${classifiedCategory} spot! Here are some similar places:`
            : `Ảnh của bạn nhìn giống cảnh ${classifiedCategory} quá! Dưới đây là một vài địa điểm tương tự nè:`;
          closing = lang === 'en'
            ? "Do you like any of them?"
            : "Bạn thấy mấy chỗ này thế nào?";
      }

      const dbImages = await this.prepareImagePayloads(
        mapped.flatMap((item) => item.images ?? []),
        'destination',
      );

      return {
        source: 'database',
        data: mapped,
        text: { opening, closing },
        images: [
          { source: 'user', url: imageUrl },
          ...dbImages,
        ],
      };

    } catch (error) {
      console.error('Image classification critical error:', error);
      return {
          source: 'ai',
          text: lang === 'en' ? "Something went wrong processing your image." : "Có lỗi xảy ra khi xử lý ảnh của bạn."
      };
    }
  }

  private async handleRouteQuery(
    classification: Classification,
    message: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    if (!context.userId) {
      return this.generateConversationalReply(message, lang, 'route_query', {
        history: context.history,
        textOverride: lang === 'en' 
          ? 'Please log in to view your travel routes.' 
          : 'Vui lòng đăng nhập để xem lịch trình cá nhân của bạn.',
      });
    }

    // Find upcoming or in_progress routes for the user
    const routes = await this.routeRepo.find({
      where: {
        user: { id: context.userId },
        isPublic: false,
      },
      order: { startDate: 'ASC', createdAt: 'DESC' },
      take: 5,
    });

    if (!routes.length) {
      return this.generateConversationalReply(message, lang, 'route_query', {
        history: context.history,
        databaseMiss: true,
      });
    }

    // Generate a summary using Gemini
    const routesInfo = routes
      .map((r, i) => `${i + 1}. ${r.name} (${r.startDate ? r.startDate.toLocaleDateString() : 'N/A'} - ${r.endDate ? r.endDate.toLocaleDateString() : 'N/A'}) - Status: ${r.status}`)
      .join('\n');

    const prompt = lang === 'en'
      ? `User is asking about their travel plans: "${message}"\nHere are their recent trips:\n${routesInfo}\n\nSummarize these trips naturally. If they have an upcoming one, highlight it.`
      : `Người dùng đang hỏi về lịch trình: "${message}"\nĐây là các chuyến đi gần đây:\n${routesInfo}\n\nHãy tóm tắt các chuyến đi này một cách tự nhiên. Nếu có chuyến đi sắp tới, hãy nhấn mạnh nó.`;

    const response = await this.performModelCall(
      (model) => model.generateContent(prompt),
      this.modelName,
    );

    // Collect some images from the stops of these routes
    const routeIds = routes.map((r) => r.id);
    const firstStops = await this.stopRepo.find({
      where: { route: { id: In(routeIds) } },
      take: 5,
    });
    const stopImages = firstStops
      .flatMap((s) => s.images ?? [])
      .slice(0, 5);
    const images = await this.prepareImagePayloads(stopImages, 'destination');

    return {
      source: 'ai',
      text: this.extractText(response),
      images: images.length > 0 ? images : undefined,
    };
  }

  private async handleRouteDetail(
    classification: Classification,
    message: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    if (!context.userId) {
      return this.generateConversationalReply(message, lang, 'route_detail', {
        history: context.history,
        textOverride: lang === 'en' 
          ? 'Please log in to view trip details.' 
          : 'Vui lòng đăng nhập để xem chi tiết chuyến đi.',
      });
    }

    // Attempt to find the specific route mentioned or the most relevant one
    let targetRoute: TravelRoute | null = null;
    
    if (classification.keywords.length > 0) {
      // Search by name keywords
      const qb = this.routeRepo.createQueryBuilder('route')
        .where('route.user_id = :userId', { userId: context.userId })
        .andWhere('route.isPublic = :isPublic', { isPublic: false });
      
      const subClauses: string[] = [];
      classification.keywords.forEach((kw, i) => {
        subClauses.push(`route.name ILIKE :kw${i}`);
        qb.setParameter(`kw${i}`, `%${kw}%`);
      });
      qb.andWhere(`(${subClauses.join(' OR ')})`);
      
      targetRoute = await qb.orderBy('route.startDate', 'ASC').getOne();
    }

    if (!targetRoute) {
      // Fallback: Get the most recent/upcoming route
      targetRoute = await this.routeRepo.findOne({
        where: { user: { id: context.userId }, isPublic: false },
        order: { startDate: 'ASC', createdAt: 'DESC' },
      });
    }

    if (!targetRoute) {
      return this.generateConversationalReply(message, lang, 'route_detail', {
        history: context.history,
        databaseMiss: true,
      });
    }

    // Fetch full details with stops
    const fullRoute = await this.routeRepo.findOne({
      where: { id: targetRoute.id },
      relations: { stops: { destination: true } },
      order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
    });

    if (!fullRoute || !fullRoute.stops?.length) {
      const emptyText = lang === 'en'
        ? `I found your trip "${targetRoute.name}" but it doesn't have any stops planned yet.`
        : `Tôi đã tìm thấy chuyến đi "${targetRoute.name}" của bạn nhưng hiện chưa có điểm dừng nào trong lịch trình.`;
      return { source: 'ai', text: emptyText };
    }

    // Summarize the itinerary
    const stopsInfo = fullRoute.stops
      .map(s => {
        const destName = s.destination?.name || 'Unknown';
        const time = s.startTime ? ` at ${s.startTime}` : '';
        return `- Day ${s.dayOrder}: ${destName}${time}${s.notes ? ` (${s.notes})` : ''}`;
      })
      .join('\n');

    const prompt = lang === 'en'
      ? `User wants details for trip: "${fullRoute.name}"\nItinerary:\n${stopsInfo}\n\nPresent this itinerary to the user in a helpful, friendly way. Highlight the start date: ${fullRoute.startDate?.toLocaleDateString()}.`
      : `Người dùng muốn xem chi tiết chuyến đi: "${fullRoute.name}"\nLịch trình:\n${stopsInfo}\n\nHãy trình bày lịch trình này cho người dùng một cách hữu ích và thân thiện. Nhấn mạnh ngày bắt đầu: ${fullRoute.startDate?.toLocaleDateString()}.`;

    const response = await this.performModelCall(
      (model) => model.generateContent(prompt),
      this.modelName,
    );

    // Collect images from all stops in this route
    const stopImages = fullRoute.stops
      .flatMap((s) => s.images ?? [])
      .slice(0, 10);
    const images = await this.prepareImagePayloads(stopImages, 'destination');

    return {
      source: 'ai',
      text: this.extractText(response),
      images: images.length > 0 ? images : undefined,
    };
  }

  private async handleTransportSearch(
    classification: Classification,
    message: string,
    lang: ChatLanguage,
    context: ChatRuntimeContext,
  ): Promise<ChatResponse> {
    const { regions, keywords } = classification;
    
    // Attempt to extract origin and destination from regions
    // prompt instructed to put origin/destination in regions
    let origin = regions[0] || '';
    let destination = regions[1] || '';

    // If keywords contain likely cities but regions is empty, try to use keywords
    if (!origin && keywords.length > 0) origin = keywords[0];
    if (!destination && keywords.length > 1) destination = keywords[1];

    if (!origin && !destination) {
      return this.generateConversationalReply(message, lang, 'transport_search', {
        history: context.history,
        textOverride: lang === 'en'
          ? 'Where would you like to travel from and to? Please specify cities like "from Saigon to Hanoi".'
          : 'Bạn muốn đi từ đâu đến đâu? Vui lòng cho tôi biết địa điểm cụ thể nhé (ví dụ: "từ Sài Gòn đi Hà Nội").',
      });
    }

    // 1. Search Buses
    const busQb = this.busRepo.createQueryBuilder('bus');
    if (origin) busQb.andWhere('bus.route ILIKE :origin', { origin: `%${origin}%` });
    if (destination) busQb.andWhere('bus.route ILIKE :dest', { dest: `%${destination}%` });
    const buses = await busQb.take(5).getMany();

    // 2. Search Trains
    const trainQb = this.trainRepo.createQueryBuilder('train');
    if (origin) trainQb.andWhere('train.departureStation ILIKE :origin', { origin: `%${origin}%` });
    if (destination) trainQb.andWhere('train.arrivalStation ILIKE :dest', { dest: `%${destination}%` });
    const trains = await trainQb.take(5).getMany();

    // 3. Search Flights
    const flightQb = this.flightRepo.createQueryBuilder('flight');
    if (origin) flightQb.andWhere('flight.departureAirport ILIKE :origin', { origin: `%${origin}%` });
    if (destination) flightQb.andWhere('flight.arrivalAirport ILIKE :dest', { dest: `%${destination}%` });
    const flights = await flightQb.take(5).getMany();

    if (!buses.length && !trains.length && !flights.length) {
      return this.generateConversationalReply(message, lang, 'transport_search', {
        history: context.history,
        databaseMiss: true,
      });
    }

    // Format data for Gemini
    const busData = buses.map(b => `- Bus: ${b.name}, Price: ${b.price}, Route: ${b.route}`).join('\n');
    const trainData = trains.map(t => `- Train: ${t.name}, From ${t.departureStation} to ${t.arrivalStation}, Price: ${t.basePrice}, Departure: ${t.departureTime}`).join('\n');
    const flightData = flights.map(f => `- Flight: ${f.airline} ${f.flightNumber}, From ${f.departureAirport} to ${f.arrivalAirport}, Price: ${f.basePrice}, Time: ${f.departureTime}`).join('\n');

    const prompt = lang === 'en'
      ? `User wants to find transport: "${message}"\nDetected Origin: "${origin}", Destination: "${destination}"\n\nResults:\nBUSES:\n${busData || 'None found'}\n\nTRAINS:\n${trainData || 'None found'}\n\nFLIGHTS:\n${flightData || 'None found'}\n\nPresent these options clearly. Group them by type. Suggest the best or cheapest if obvious. Ask if they want to book any of these.`
      : `Người dùng muốn tìm phương tiện di chuyển: "${message}"\nĐiểm đi: "${origin}", Điểm đến: "${destination}"\n\nKết quả:\nXE KHÁCH:\n${busData || 'Không tìm thấy'}\n\nTÀU HỎA:\n${trainData || 'Không tìm thấy'}\n\nMÁY BAY:\n${flightData || 'Không tìm thấy'}\n\nHãy trình bày các lựa chọn này một cách rõ ràng theo từng loại. Gợi ý phương án tốt nhất hoặc rẻ nhất nếu có thể. Hỏi xem họ có muốn đặt vé nào không.`;

    const response = await this.performModelCall(
      (model) => model.generateContent(prompt),
      this.modelName,
    );

    // Collect vehicle photos
    const vehiclePhotos = [
      ...buses.map((b) => b.photo),
      ...trains.map((t) => t.photo),
      ...flights.map((f) => f.photo),
    ].filter((p): p is string => !!p);

    const images = await this.prepareImagePayloads(
      vehiclePhotos.slice(0, 5),
      'destination',
    );

    return {
      source: 'ai',
      text: this.extractText(response),
      images: images.length > 0 ? images : undefined,
    };
  }

  private async findDestinationsByCategories(
    categories: string[],
    profile?: ChatUserProfile | null,
  ): Promise<Destination[]> {
    const qb = this.destinationRepo.createQueryBuilder('destination');
    qb.where('destination.available = :available', { available: true });

    // Match any of the categories
    if (categories.length) {
      qb.andWhere('destination.categories && ARRAY[:...cats]::text[]', {
        cats: categories,
      });
    }

    // Optionally filter by user's preferred regions
    if (profile?.preferredRegions?.length) {
      const regionClauses = profile.preferredRegions
        .slice(0, 3)
        .map((_, i) => `destination.province ILIKE :region${i}`);
      
      if (regionClauses.length) {
        qb.andWhere(`(${regionClauses.join(' OR ')})`);
        profile.preferredRegions.slice(0, 3).forEach((region, i) => {
          qb.setParameter(`region${i}`, `%${region}%`);
        });
      }
    }

    return qb
      .orderBy('destination.favouriteTimes', 'DESC')
      .addOrderBy('destination.rating', 'DESC')
      .take(10)
      .getMany();
  }

  private async searchDestinations(terms: string[], province?: string): Promise<Destination[]> {
    if (!terms.length && !province) {
      return [];
    }

    const qb = this.destinationRepo.createQueryBuilder('destination');
    const clauses: string[] = [];

    if (province) {
        // Relax filter: check province, district, address, or name for user's region term
        qb.andWhere(
          `(destination.province ILIKE :province OR destination.district ILIKE :province OR destination.specificAddress ILIKE :province OR destination.name ILIKE :province)`,
          { province: `%${province}%` },
        );
    }

    terms.forEach((term, index) => {
      const key = `kw${index}`;
      clauses.push(
        `(destination.name ILIKE :${key} OR destination.province ILIKE :${key} OR COALESCE(destination.descriptionViet, '') ILIKE :${key} OR COALESCE(destination.descriptionEng, '') ILIKE :${key} OR destination.specificAddress ILIKE :${key})`,
      );
      qb.setParameter(key, `%${term}%`);
    });
    
    if (clauses.length > 0) {
        qb.andWhere(`(${clauses.join(' OR ')})`);
    }

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

  private removeAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  private buildSearchTerms(
    classification: Classification,
    fallback: string,
    profile?: ChatUserProfile | null,
  ): string[] {
    const source = new Set<string>();
    
    // 1. Prioritize explicit keywords and regions from the current query
    classification.keywords.forEach((kw) => {
      source.add(kw);
      source.add(this.removeAccents(kw));
    });
    classification.regions.forEach((region) => {
      source.add(region);
      source.add(this.removeAccents(region));
    });

    // 2. Only if NO explicit terms are found, fall back to profile preferences and the raw message fallback
    if (source.size === 0) {
      if (profile) {
        profile.preferredRegions
          .slice(0, 2)
          .forEach((region) => {
             source.add(region);
             source.add(this.removeAccents(region));
          });
        if (classification.intent === 'destination') {
          profile.preferredThemes
            .slice(0, 2)
            .forEach((theme) => {
               source.add(theme);
               source.add(this.removeAccents(theme));
            });
        }
      }
      if (fallback.trim()) {
        const raw = fallback.trim();
        source.add(raw);
        source.add(this.removeAccents(raw));
      }
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
    const header = `Đây là một vài ${kind} bạn có thể tham khảo:`;
    const bullet = items
      .map((item) => {
        const address = item.address ? `, địa chỉ: ${item.address}` : '';
        const description = item.description
          ? `. gợi ý: ${item.description}`
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

  /* Generates a friendly, possibly witty, reply */
  async generateConversationalReply(
    message: string,
    lang: ChatLanguage,
    intent: ChatIntent,
    context: {
      history?: Content[];
      profileSummary?: string;
      databaseMiss?: boolean;
      textOverride?: string;
      attachments?: NormalizedImageAttachment[];
    } = {},
  ): Promise<ChatResponse> {
    if (context.textOverride) {
      if (typeof context.textOverride === 'string') {
        return { source: 'ai', text: context.textOverride };
      }
      return { source: 'ai', text: context.textOverride };
    }
    
    // Quick fallback checks
    if (intent === 'greeting' && this.isSimpleGreeting(message)) {
       const greetings = lang === 'en' 
         ? ["Hello! How can I help you today?", "Hi there! Planning a trip?", "Greetings! where do you want to go?"]
         : ["Xin chào! Mình có thể giúp gì cho bạn?", "Chào bạn! Bạn đang lên kế hoạch đi đâu thế?", "Chào bạn! Hôm nay bạn muốn tìm địa điểm nào?"];
       return { source: 'ai', text: greetings[Math.floor(Math.random() * greetings.length)] };
    }

    if (intent === 'other' || context.databaseMiss) {
       // If standard processing failed or intent is unknown
       // try AI generation but with heavy fallback protection
    } else {
       // specific intent (destination/restaurant etc) but no db results found -> generate conversational "Sorry"
    }

    const history = context.history || [];
    const profileSummary = context.profileSummary || '';
    
    const prompt = lang === 'en'
      ? `You are an intelligent travel assistant. The user said: "${message}". Context: Intent=${intent}. ${profileSummary ? `User Profile: ${profileSummary}` : ''}. Respond naturally, concisely, and helpfully. Max 2 sentences.`
      : `Bạn là trợ lý du lịch thông minh. Người dùng nói: "${message}". Intent=${intent}. ${profileSummary ? `Hồ sơ người dùng: ${profileSummary}` : ''}. Hãy trả lời tự nhiên, ngắn gọn và hữu ích. Tối đa 2 câu.`;

    try {
        const response = await this.performModelCall(
        (model) => model.generateContent({
            systemInstruction: {
            role: 'system',
            parts: [{ text: prompt }],
            },
            contents: [
            ...history,
            { role: 'user', parts: [{ text: message }] },
            ],
        }),
        this.modelName,
        );
        return { source: 'ai', text: this.extractText(response) };
    } catch (error) {
        console.warn('Conversational AI failed, using fallback:', error.message);
        
        let staticText = lang === 'en' 
            ? "I'm having trouble connecting to my creative brain right now. Can you try again?" 
            : "Hiện tại hệ thống AI đang bận, mình chưa thể trả lời chi tiết được.";

        if (intent === 'greeting') {
            staticText = lang === 'en' ? "Hello! How can I assist you with your travels?" : "Xin chào! Mình có thể giúp gì cho chuyến đi của bạn?";
        } else if (intent === 'destination') {
            staticText = lang === 'en'
                ? "I couldn't find specific details right now, but I can help you search for other places."
                : "Mình chưa tìm thấy thông tin chi tiết lúc này, bạn thử tìm địa điểm khác xem sao nhé.";
        } else if (intent === 'my_routes') {
             staticText = lang === 'en' ? "Here is your route info." : "Thông tin lịch trình của bạn đây.";
        }

        return { source: 'ai', text: staticText };
    }
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

    try {
      const response = await this.performModelCall((model) =>
        model.generateContent({
          systemInstruction: {
            role: 'system',
            parts: [
              {
              text: 'Classify the travel intent of the user. Valid intents: destination, restaurant, hotel, service, app_guide, booking_help, transport, image_request, profile_update, route_query, route_detail, transport_search, my_orders, my_routes, search_vehicle, search_hotel, search_restaurant, create_route, other. Extract up to five keywords, regions, and categories. "my_orders" for looking up rental bills. "my_routes" for listing user trips. "search_vehicle" for renting bikes/cars. "search_hotel"/"search_restaurant" for finding accommodation/dining using external service. "create_route" for planning a new trip. If the user requests images set imageRequested to true. Reply ONLY with JSON {"intent":string,"keywords":string[],"regions":string[],"categories":string[],"followUp":boolean,"imageRequested":boolean}.',
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

      let raw = this.extractText(response);
      if (raw) {
        raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
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
    } catch (error) {
      console.warn('[Chatbot] Classification failed, failing back to keywords:', error.message);
      return this.simpleKeywordClassification(message);
    }
  }

  private simpleKeywordClassification(message: string): Classification {
    const msgLower = message.toLowerCase();

    // Extract common regions (popular Vietnamese destinations)
    const popularRegions = [
      'hà nội', 'hồ chí minh', 'đà nẵng', 'đà lạt', 'nha trang',
      'phú quốc', 'hội an', 'sapa', 'huế', 'vũng tàu', 'quy nhơn',
      'phan thiết', 'mũi né', 'cần thơ', 'hạ long', 'ninh bình',
      'tam đảo', 'bà nà', 'cát bà', 'côn đảo',
    ];
    const detectedRegions: string[] = [];
    for (const region of popularRegions) {
      if (msgLower.includes(region)) {
        detectedRegions.push(region);
      }
    }
    
    // Quick Keyword Matching
    if (msgLower.includes('đơn hàng') || msgLower.includes('tour đã đặt') || msgLower.includes('order')) return { intent: 'my_orders', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };
    if (msgLower.includes('chuyến đi của tôi') || msgLower.includes('lịch trình của tôi') || msgLower.includes('route')) return { intent: 'my_routes', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };
    if (msgLower.includes('thuê xe') || msgLower.includes('car rental') || msgLower.includes('bike')) return { intent: 'search_vehicle', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };
    
    if (msgLower.includes('khách sạn') || msgLower.includes('hotel') || msgLower.includes('nghỉ dưỡng')) return { intent: 'search_hotel', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };
    if (msgLower.includes('nhà hàng') || msgLower.includes('quán ăn') || msgLower.includes('restaurant') || msgLower.includes('ăn uống')) return { intent: 'search_restaurant', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };
    
    if (msgLower.includes('tạo lịch trình') || msgLower.includes('plan trip') || msgLower.includes('lập kế hoạch')) return { intent: 'create_route', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };
    
    if (msgLower.includes('xe khách') || msgLower.includes('tàu hỏa') || msgLower.includes('máy bay') || msgLower.includes('vé xe')) return { intent: 'transport_search', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };

    // Default to destination if looks like a location search, otherwise other
    if (msgLower.includes('ở đâu') || msgLower.includes('chơi gì') || msgLower.includes('địa điểm') || msgLower.includes('du lịch') || detectedRegions.length > 0) {
        return { intent: 'destination', keywords: [], regions: detectedRegions, categories: [], followUp: false, imageRequested: false };
    }

    return {
        intent: 'other',
        keywords: [],
        regions: detectedRegions,
        categories: [],
        followUp: false,
        imageRequested: false,
    };
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
      case 'image_classify':
      case 'profile_update':
      case 'route_query':
      case 'route_detail':
      case 'transport_search':
        return intent;
      default:
        return 'other';
    }
  }

  private isSimpleGreeting(message: string): boolean {
    const greetingKeywords = [
      'hello', 'hi', 'hey', 'greetings', 'hola',
      'chào', 'xin chào', 'hi ban', 'hey ban',
      'tạm biệt', 'bye', 'goodbye', 'hen gap lai',
      'cảm ơn', 'thanks', 'thank you', 'cam on',
    ];
    const normalized = message.toLowerCase().trim();
    return greetingKeywords.some(keyword => normalized === keyword || normalized === keyword + '!');
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
        : 'Đây là một số hình ảnh rất đẹp. Hãy cho tôi biết bạn muốn gợi ý gì thêm.')
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
                  : 'Viết một câu ngắn gọn giới thiệu bộ ảnh du lịch từ thư viện gợi ý.',
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
        : 'Đây là một số hình ảnh phù hợp với yêu cầu của bạn.')
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
    const text = response.text;
    if (typeof text === 'string') {
        return text;
    }
    if (text && typeof text === 'object') {
        return `${text.opening}\n${text.closing}`;
    }

    if (response.source === 'database') {
        const items = response.data
        .map((item) => `${item.name}${item.address ? ` - ${item.address}` : ''}`)
        .join('\n');
        return items || 'No response generated.';
    }
    
    return 'No response generated.';
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
      const result = await call(model);
      return result;
    } catch (error) {
      console.error('[Gemini Error]', error);
      // Re-throw to be caught by specific intent handlers or generateConversationalReply fallbacks
      throw error;
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
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Gemini API key is not configured.',
      );
    }
    // Log masked key for debugging
    const maskedKey = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
    console.log(`[Gemini] Using API key: ${maskedKey}`);
    
    this.geminiClient = new GoogleGenerativeAI(apiKey);
    return this.geminiClient;
  }
  private extractText(result: GenerateContentResult | undefined): string {
    if (!result) {
      return '';
    }
    return result.response.text();
  }

  // Public method for testing image classification directly
  async classifyImageOnly(file: Express.Multer.File): Promise<any> {
    try {
      // 1. Upload
      const b64 = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${b64}`;
      const uploadResult = await this.cloudinaryService.uploadBase64Image(dataUri, 'chatbot_debug');
      const imageUrl = uploadResult.secure_url;

      // 2. Classify
      const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
      const classifyResponse = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/vision/classify`, { imageUrl }),
      );
      
      const rawClass = classifyResponse.data?.class || classifyResponse.data?.predicted_class || 'unknown';
      const categories = this.aiClassToCategoryMap[rawClass] || [];

      return {
        imageUrl,
        aiClass: rawClass,
        mappedCategories: categories,
        rawResponse: classifyResponse.data
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
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

  // --- UNIFIED CHATBOT HANDLERS ---

  private async extractSearchParameters(
    message: string,
    type: 'vehicle' | 'hotel' | 'restaurant',
  ): Promise<Record<string, any>> {
    const now = new Date();
    const prompt = `
      User request: "${message}"
      Current time: ${now.toISOString()}
      Task: Extract search parameters for ${type} search.
      
      For 'vehicle': Extract 'location' (province/city), 'startDate', 'endDate', 'vehicleType' (bike/car).
      For 'hotel'/'restaurant': Extract 'location' (province/city), 'q' (keywords/name).

      If dates are relative (e.g. "tomorrow", "next monday"), convert to ISO 8601.
      Reply ONLY with JSON.
    `;

    const response = await this.performModelCall(
      (model) => model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
      this.modelName,
    );

    try {
      return JSON.parse(this.extractText(response));
    } catch {
      return {};
    }
  }

  private async handleMyOrders(userId: number, message: string, lang: ChatLanguage): Promise<ChatResponse> {
    const bills = await this.rentalBillsService.findAll(userId);
    // Simple filter if user asked for specific status
    let displayBills = bills;
    if (message.toLowerCase().includes('hủy') || message.toLowerCase().includes('cancel')) {
      displayBills = bills.filter(b => b.status === RentalBillStatus.CANCELLED);
    } else if (message.toLowerCase().includes('đang') || message.toLowerCase().includes('active')) {
      displayBills = bills.filter(b => [RentalBillStatus.PENDING, RentalBillStatus.PAID, RentalBillStatus.COMPLETED].includes(b.status));
    }

    // Sort by recent
    displayBills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limited = displayBills.slice(0, 5);

    return {
      source: 'database',
      data: limited as any, 
      text: {
        opening: lang === 'en' ? "Here are your orders:" : "Đây là các đơn hàng của bạn:",
        closing: lang === 'en' ? "Let me know if you need help with any of them." : "Cần hỗ trợ gì thêm về đơn hàng thì bảo mình nhé."
      } as any
    };
  }

  private async handleMyRoutes(userId: number, message: string, lang: ChatLanguage): Promise<ChatResponse> {
      const routes = await this.travelRoutesService.findAll({ userId });
      const limited = routes.slice(0, 5);
      
      return {
          source: 'database',
          data: limited as any,
          text: {
              opening: lang === 'en' ? "Here are your travel plans:" : "Lịch trình của bạn đây:",
              closing: lang === 'en' ? "Ready to create a new one?" : "Bạn có muốn tạo lịch trình mới không?"
          } as any
      }
  }

  private async handleVehicleSearch(userId: number, message: string, lang: ChatLanguage): Promise<ChatResponse> {
    const params = await this.extractSearchParameters(message, 'vehicle');
    
    // Slot Filling Validation
    if (!params.location || !params.startDate || !params.endDate) {
       return {
         source: 'ai',
         text: lang === 'en' 
           ? "I can help you find a vehicle. Where do you want to rent, and for which dates?"
           : "Mình có thể tìm xe giúp bạn. Bạn muốn thuê xe ở đâu và đi ngày nào (từ ngày nào đến ngày nào)?"
       };
    }

    const results = await this.rentalVehiclesService.search({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      province: params.location,
      vehicleType: params.vehicleType, 
      rentalType: RentalType.DAILY // default or extract?
    });

    const limited = results.slice(0, 5);
    
    // Generate Text
    let opening = '', closing = '';
    if (limited.length > 0) {
        opening = lang === 'en' ? `Found ${limited.length} vehicles in ${params.location}:` : `Tìm thấy ${limited.length} xe tại ${params.location}:`;
        closing = lang === 'en' ? "Would you like to book one?" : "Bạn ưng chiếc nào không?";
    } else {
        opening = lang === 'en' ? `No vehicles found in ${params.location} for those dates.` : `Không tìm thấy xe nào ở ${params.location} vào ngày đó.`;
        closing = lang === 'en' ? "Try changing dates or location." : "Bạn thử đổi ngày hoặc địa điểm xem sao.";
    }

    return {
        source: 'database',
        data: limited as any,
        text: { opening, closing } as any
    };
  }

  private async handleExternalSearch(userId: number, message: string, lang: ChatLanguage, type: 'HOTEL' | 'RESTAURANT'): Promise<ChatResponse> {
     const params = await this.extractSearchParameters(message, type === 'HOTEL' ? 'hotel' : 'restaurant');
     const results = await this.cooperationsService.findAll({
         type: type,
         province: params.location,
         q: params.q,
         active: true
     });
     
     const limited = results.slice(0, 5);

     return {
         source: 'database',
         data: limited as any,
         text: {
             opening: lang === 'en' ? `Here are some ${type.toLowerCase()}s:` : `Đây là một số ${type === 'HOTEL' ? 'khách sạn' : 'nhà hàng'} mình tìm được:`,
             closing: lang === 'en' ? "Need more details?" : "Bạn cần thông tin chi tiết không?"
         } as any
     };
  }

  private async handleCreateRoute(userId: number, message: string, lang: ChatLanguage): Promise<ChatResponse> {
      return {
          source: 'ai',
          text: lang === 'en' 
            ? "To create a route, please use the 'Plan Trip' feature in the menu for the best experience. I can help you find destinations though!"
            : "Để tạo lộ trình chi tiết, bạn hãy dùng tính năng 'Lập kế hoạch' trên menu nhé. Mình sẽ giúp bạn tìm địa điểm đẹp!"
      };
  }
}
