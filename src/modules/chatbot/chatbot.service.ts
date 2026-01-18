import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Content,
  GenerativeModel,
  GoogleGenerativeAI,
  Part,
  Tool,
  SchemaType,
} from '@google/generative-ai';
import { Repository } from 'typeorm';
import { ChatCache } from './entities/chat-cache.entity';
import { ChatUserProfile } from './entities/chat-user-profile.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../user/entities/user.entity';
import { RentalBillsService } from '../rental-bill/rental-bill.service';
import { RentalVehiclesService } from '../rental-vehicle/rental-vehicle.service';
import { TravelRoutesService } from '../travel-route/travel-route.service';
import { CooperationsService } from '../cooperation/cooperation.service';
import { FeedbackService } from '../feedback/feedback.service';
import { EateriesService } from '../eatery/eatery.service';
import { DestinationsService } from '../destination/destination.service';
import { ChatImageAttachmentDto } from './dto/chat-request.dto';

export interface ChatResponse {
  source: 'ai' | 'rule';
  text: string;
  relatedEntities?: {
    type: 'destination' | 'eatery' | 'route' | 'service';
    data: any[];
  }[];
  actions?: {
    label: string;
    screen: string; // e.g., 'route_suggestion', 'destination_detail'
    params?: any;
  }[];
}
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

// --- Tool Definitions ---
const CHAT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_destinations',
        description: 'Search for specific travel destinations or places to visit.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: 'Name of the place or keyword' },
            province: { type: SchemaType.STRING, description: 'Province to filter by (optional)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'recommend_destinations',
        description: 'Recommend destinations based on user preferences or general criteria.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            province: { type: SchemaType.STRING, description: 'Province to prioritize' },
            hobbies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'User hobbies' },
          },
        },
      },
      {
        name: 'search_eateries',
        description: 'Search for eateries, restaurants, or food places.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            keyword: { type: SchemaType.STRING, description: 'Name of restaurant or dish' },
            province: { type: SchemaType.STRING, description: 'Province to filter by' },
            nearby: { type: SchemaType.BOOLEAN, description: 'If true, search near user location' },
          },
        },
      },
      {
        name: 'recommend_services',
        description: 'Find other services like Hotels, Transport (bus, train, flight), etc.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            type: { 
              type: SchemaType.STRING, 
              format: 'enum',
              description: 'Type of service', 
              enum: ['hotel', 'transportation', 'restaurant', 'delivery', 'tour'] 
            },
            province: { type: SchemaType.STRING, description: 'Province filter' },
            query: { type: SchemaType.STRING, description: 'Search keyword' },
          },
          required: ['type'],
        },
      },
      {
        name: 'suggest_travel_route',
        description: 'Suggest a travel route (itinerary) for the user. Ask for missing Province or Dates if needed.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            province: { type: SchemaType.STRING, description: 'Target province' },
            startDate: { type: SchemaType.STRING, description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: SchemaType.STRING, description: 'End date (YYYY-MM-DD)' },
          },
          required: ['province'],
        },
      },
      {
        name: 'get_feedback_stats',
        description: 'Get reviews, stats, and advice about a place based on user feedback.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: 'Name of the place/service' },
            type: { 
              type: SchemaType.STRING, 
              format: 'enum',
              enum: ['destination', 'cooperation', 'eatery', 'route'] 
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_user_stats',
        description: 'Get statistics about the current user (trips, points, etc.).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_app_policy',
        description: 'Get information about app policies, rules, reward points (200 pts/check-in), or registration.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            topic: { type: SchemaType.STRING, description: 'Topic: rental_rule, checkin_rule, points_rule, registration' },
          },
          required: ['topic'],
        },
      },
    ],
  },
];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly modelName = 'gemini-2.5-flash'; 
  private geminiClients: GoogleGenerativeAI[] = [];
  private currentClientIndex = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cloudinaryService: CloudinaryService,
    @InjectRepository(ChatCache) private readonly cacheRepo: Repository<ChatCache>,
    @InjectRepository(ChatUserProfile) private readonly profileRepo: Repository<ChatUserProfile>,
    @InjectRepository(ChatMessage) private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly rentalBillsService: RentalBillsService,
    private readonly rentalVehiclesService: RentalVehiclesService,
    private readonly travelRoutesService: TravelRoutesService,
    private readonly cooperationsService: CooperationsService,
    private readonly feedbackService: FeedbackService,
    private readonly eateriesService: EateriesService,
    private readonly destinationsService: DestinationsService,
  ) {
    this.initGeminiClients();
  }

  private initGeminiClients() {
    const k1 = this.configService.get<string>('GEMINI_API_KEY');
    const k2 = this.configService.get<string>('GEMINI_API_KEY_2');
    const k3 = this.configService.get<string>('GEMINI_API_KEY_3');

    const keys = [k1, k2, k3].filter((k): k is string => !!k && k.length > 0);

    this.logger.log(`[InitGemini] Found ${keys.length} keys. Models will be initialized.`);
    if (keys.length === 0) {
      this.logger.error('No GEMINI_API_KEY found in ConfigService. Please check .env file.');
    }

    this.geminiClients = keys.map((key) => new GoogleGenerativeAI(key));
  }

  private getModel(modelName = this.modelName): GenerativeModel {
    if (this.geminiClients.length === 0) {
      throw new Error('Gemini clients not initialized');
    }
    const client = this.geminiClients[this.currentClientIndex];
    this.currentClientIndex = (this.currentClientIndex + 1) % this.geminiClients.length;
    return client.getGenerativeModel({ model: modelName });
  }


  async handleChat(
    rawMessage: string,
    lang: string = 'vi',
    options?: { userId?: number; sessionId?: string; images?: ChatImageAttachmentDto[] },
  ): Promise<ChatResponse> {
    const message = rawMessage?.trim();
    if (!message && (!options?.images || options.images.length === 0)) {
       throw new BadRequestException('Empty message');
    }

    const userId = options?.userId;
    const sessionId = options?.sessionId || `anon-${Date.now()}`;
    const user = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;

    // 1. Load History (Context)
    const history = await this.getHistory(userId, sessionId);
    
    // 2. Prepare Request
    const systemInstruction = `
      You are a smart travel assistant for the Traveline app.
      Your goal is to help users with travel plans, specialized searches (destinations, food, services), route planning, and app usage.

      RULES:
      1. **ALWAYS USE TOOLS** to fetch data. Do not answer from your own knowledge unless it's general advice.
      2. **QUERY OPTIMIZATION**: When calling tools, use bare keywords. Strip adjectives. 
      3. **RESPONSE STYLE (UI-FRIENDLY)**: 
         - Use a friendly, conversational tone.
         - **CONCISENESS**: When tools return a list of places, the frontend will display them as **Cards**. 
         - **DO NOT** repeat detailed descriptions or addresses in your text if cards are visible. 
      4. **SUGGESTED ACTIONS (DEEP LINKS)**: 
         - When you suggest a route, recommend an action to 'Xem chi tiết lộ trình' (screen: 'route_suggestion').
         - When you suggest a specific service, recommend an action to 'Đặt dịch vụ' (screen: 'service_booking').
         - To provide an action, include a special block at the end of your text like this: [ACTION: label|screen|params_json]. 
      5. **FEEDBACK ANALYSIS**: When a user asks for an opinion or advice about a place, use 'get_feedback_stats'.
      6. **IMAGE ANALYSIS**: Describe the image briefly, then call a tool or ask for the province.
      7. **REWARD RULES**: 1 pt / 100 VNĐ; 200 pts / Check-in; 500 pts / Shared route use; 20 pts / Review; 10 pts / Interaction.
      8. Speak in the user's language (Vietnamese primarily).
      
      CURRENT USER CONTEXT:
      - Location: ${user?.address || 'Unknown'}
      - ID: ${userId}
    `;

    const parts: Part[] = [{ text: message }];
    
    // Handle Images
    if (options?.images?.length) {
       for (const img of options.images) {
           if (img.data) {
               parts.push({
                   inlineData: {
                       data: img.data.split(',')[1] || img.data, // Check if data has prefix
                       mimeType: img.mimeType || 'image/jpeg',
                   }
               });
           }
       }
    }

    let lastError: any;
    // Retry attempts based on number of available clients
    const maxRetries = this.geminiClients.length || 1; 

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = this.getModel();
        const chatSession = model.startChat({
          history: history,
          tools: CHAT_TOOLS,
          systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
        });

        // First Turn
        let result = await chatSession.sendMessage(parts);
        let response = result.response;
        let functionCalls = response.functionCalls();

        // Loop for Tool Execution (Max 3 turns)
        let turns = 0;
        let collectedEntities: { type: any, data: any[] }[] = [];

        while (functionCalls && functionCalls.length > 0 && turns < 3) {
           turns++;
           const toolParts: Part[] = [];
           
           for (const call of functionCalls) {
               this.logger.log(`Executing Tool: ${call.name} with args ${JSON.stringify(call.args)}`);
               
               const toolOutput = await this.executeTool(call.name, call.args, user);

               // Separate result for AI and entities for Frontend
               const resultText = toolOutput.result;
               if (toolOutput.entities && toolOutput.entities.length > 0 && toolOutput.type) {
                   collectedEntities.push({
                       type: toolOutput.type as any,
                       data: toolOutput.entities
                   });
               }

               toolParts.push({
                   functionResponse: {
                       name: call.name,
                       response: { result: resultText }
                   }
               });
           }

           // Send tool results back to model
           result = await chatSession.sendMessage(toolParts);
           response = result.response;
           functionCalls = response.functionCalls();
        }

        let textResult = response.text();
        const actions: any[] = [];
        
        // Parse [ACTION: label|screen|params] from text
        const actionRegex = /\[ACTION:\s*([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]/g;
        textResult = textResult.replace(actionRegex, (match, label, screen, params) => {
           try {
              actions.push({
                 label: label.trim(),
                 screen: screen.trim(),
                 params: params ? JSON.parse(params.trim()) : undefined
              });
           } catch (e) {}
           return ''; // Strip action from text
        }).trim();

        // Save interaction to DB
        await this.saveMessage(userId, sessionId, 'user', message);
        await this.saveMessage(userId, sessionId, 'model', textResult);

        return {
          source: 'ai',
          text: textResult,
          relatedEntities: collectedEntities.length > 0 ? collectedEntities : undefined,
          actions: actions.length > 0 ? actions : undefined,
        };

      } catch (e: any) {
        lastError = e;
        // Check for 429 Too Many Requests
        if (e.status === 429 || (e.message && e.message.includes('429'))) {
           this.logger.warn(`Gemini 429 Rate Limit hit. Retrying with next key... (Attempt ${attempt + 1}/${maxRetries})`);
           continue; // Loop will call getModel() which rotates the index
        }
        
        this.logger.error('Gemini Chat Error', e);
        // If not 429, break and return error immediately to avoid wasting keys on hard errors?
        // Or should we try next key for generic 500s too? Let's stick to 429 for now.
        break; 
      }
    }

    // specific handling if all retries failed
    if (lastError) {
        if (lastError.status === 429 || (lastError.message && lastError.message.includes('429'))) {
             return {
                 source: 'ai',
                 text: 'Hệ thống đang quá tải (Rate Limit). Vui lòng thử lại sau vài giây hoặc nâng cấp gói API.',
             };
        }
        return {
             source: 'ai',
             text: 'Xin lỗi, hiện tại tôi đang gặp sự cố. Bạn vui lòng thử lại sau nhé!',
        };
    }
    return {
        source: 'ai',
        text: 'Xin lỗi, hiện tại tôi đang gặp sự cố không xác định.',
    };
  }

  private async executeTool(name: string, args: any, user: User | null): Promise<{ result: any, type?: string, entities?: any[] }> {
    try {
      switch (name) {
        case 'search_destinations': {
          const dests = await this.destinationsService.findAll({ q: args.query, province: args.province, limit: 5 });
          return {
              result: dests,
              type: 'destination',
              entities: dests
          };
        }
        
        case 'recommend_destinations': {
          if (!user) return { result: "User not logged in" };
          const dests = await this.destinationsService.recommendForUser(user.id, args.province, 5);
          return {
              result: dests,
              type: 'destination',
              entities: dests
          };
        }

        case 'search_eateries': {
          const eateries = await this.eateriesService.findAll({ keyword: args.keyword, province: args.province });
          return {
              result: eateries,
              type: 'eatery',
              entities: eateries
          };
        }

        case 'recommend_services': {
           const services = await this.cooperationsService.findAll({ q: args.query, type: args.type, status: undefined });
           return {
               result: services,
               type: 'service',
               entities: services
           };
        }

        case 'suggest_travel_route': {
           if (!user) return { result: "User log in required for route suggestion" };
           const today = new Date();
           const next2Days = new Date(new Date().setDate(today.getDate() + 2));
           const start = args.startDate || today.toISOString().split('T')[0];
           const end = args.endDate || next2Days.toISOString().split('T')[0];
           
           const route = await this.travelRoutesService.suggestQuick(user.id, {
             province: args.province,
             startDate: start,
             endDate: end,
           });
           return {
               result: route,
               type: 'route',
               entities: [route]
           };
        }

        case 'get_feedback_stats': {
           const type = args.type || 'destination';
           let objectId: number | undefined;
           
           // Simple name matching to find ID
           if (type === 'destination') {
             const found = await this.destinationsService.findAll({ q: args.name, limit: 1 });
             objectId = found[0]?.id;
           } else if (type === 'eatery') {
             const found = await this.eateriesService.findAll({ keyword: args.name });
             objectId = found[0]?.id;
           } else if (type === 'cooperation') {
             const found = await this.cooperationsService.findAll({ q: args.name });
             objectId = found[0]?.id;
           }

           if (!objectId) return { result: `Không tìm thấy thông tin cụ thể về ${args.name} để xem đánh giá.` };

           const feedbacks = await this.feedbackService.findByObject({
             destinationId: type === 'destination' ? objectId : undefined,
             eateryId: type === 'eatery' ? objectId : undefined,
             cooperationId: type === 'cooperation' ? objectId : undefined,
             status: 'approved'
           });

           if (feedbacks.length === 0) return { result: `Chưa có lượt đánh giá nào cho ${args.name}. Bạn có thể là người đầu tiên!` };

           const avgRating = feedbacks.reduce((acc, f) => acc + (f.star || 0), 0) / feedbacks.length;
           const comments = feedbacks.slice(0, 3).map(f => f.comment).filter(Boolean);
           
           return { 
             result: {
               name: args.name,
               rating: avgRating.toFixed(1),
               totalReviews: feedbacks.length,
               notableComments: comments,
               advice: avgRating >= 4 ? "Đáng để trải nghiệm" : avgRating >= 3 ? "Bình thường, cân nhắc" : "Nên xem xét kỹ"
             } 
           };
        }

        case 'get_user_stats': {
           if (!user) return { result: "Login required" };
           const stats = {
             name: user.fullName || user.username,
             travelPoint: user.travelPoint,
             address: user.address,
             hobbies: user.hobbies,
             trips: await this.travelRoutesService.findByUser(user.id).then(r => r.length),
           };
           return { result: stats };
        }

        case 'get_app_policy':
           return { result: this.getAppPolicy(args.topic) };

        default:
          return { result: "Tool not found" };
      }
    } catch (err) {
      this.logger.error(`Tool execution failed: ${name}`, err);
      return { result: `Error executing tool ${name}: ${err.message}` };
    }
  }

  async classifyImage(file: Express.Multer.File) {
    const formData = new FormData();
    // In Node.js environment with Recent versions, we can use Blob or just pass buffer
    // To satisfy TS lint in this env:
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    formData.append('image', blob, file.originalname);

    try {
      const response = await this.httpService.axiosRef.post(
        'http://localhost:8000/vision/classify',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to classify image via AI service', error);
      throw new BadRequestException('AI Service classification failed');
    }
  }

  private getAppPolicy(topic: string) {
    const policies = {
      rental_rule: `Lưu ý khi thuê xe:\n1. Chọn xe gần vị trí của bạn để giảm phí ship.\n2. Đặt cọc tùy theo yêu cầu của từng chủ xe.\n3. Đợi chủ xe xác nhận đã giao xe rồi mới tiến hành FaceID và nhận xe.\n4. Chụp ảnh/video xe lúc nhận và trả để tránh tranh chấp hư hỏng.\n5. Trả xe: Chỉ có thể xác nhận trả sớm nhất là 30 phút trước giờ kết thúc. Trả trễ sẽ bị phụ thu phí.`,
      checkin_rule: "Khoảng cách check-in hợp lệ là 100m - 500m so với tọa độ đích.",
      points_rule: `Cách tích lũy điểm thưởng:\n- Thanh toán dịch vụ: 1 điểm cho mỗi 100 VNĐ.\n- Check-in địa điểm trong lộ trình: 200 điểm.\n- Lộ trình bạn chia sẻ được người khác sử dụng: 500 điểm/lượt.\n- Đánh giá dịch vụ: 20 điểm.\n- Tương tác (Like/Reply) đánh giá: 10 điểm.`,
      registration: "Vào mục 'Hợp tác' để đăng ký làm Đối tác (Chủ xe, Khách sạn, Nhà hàng).",
    };
    return (policies as any)[topic] || "Chưa có thông tin cụ thể về chủ đề này. Bạn cần hỗ trợ gì khác không?";
  }

  private async getHistory(userId?: number, sessionId?: string): Promise<Content[]> {
    if (!userId && !sessionId) return [];
    
    // Fetch last 10 messages
    const where: any = {};
    if (userId) {
       where.user = { id: userId };
    } else {
       where.sessionId = sessionId;
    }
    const messages = await this.messageRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 10,
    });
    
    return messages.reverse().map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
  }

  private async saveMessage(userId: number | undefined, sessionId: string, role: 'user' | 'model', content: string) {
     await this.messageRepo.save({
       user: userId ? { id: userId } : undefined,
       sessionId,
       role: role === 'user' ? 'user' : 'assistant', // Map to DB enum
       content,
       createdAt: new Date(),
     });
  }
}
