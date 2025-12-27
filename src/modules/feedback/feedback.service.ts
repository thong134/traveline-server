import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User } from '../user/entities/user.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { TravelRoute } from '../travel-route/entities/travel-route.entity';
import { RentalVehicle } from '../rental-vehicle/entities/rental-vehicle.entity';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import type { Express } from 'express';
import type { AxiosResponse } from 'axios';
import { FeedbackReply } from './entities/feedback-reply.entity';
import { FeedbackReaction, FeedbackReactionType } from './entities/feedback-reaction.entity';
import { CreateReplyDto } from './dto/create-reply.dto';

interface FeedbackQueryOptions {
  userId?: number;
  destinationId?: number;
  travelRouteId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}

import { AiModerationLog } from './entities/ai-moderation-log.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepo: Repository<TravelRoute>,
    @InjectRepository(RentalVehicle)
    private readonly rentalVehicleRepo: Repository<RentalVehicle>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(FeedbackReply)
    private readonly replyRepo: Repository<FeedbackReply>,
    @InjectRepository(FeedbackReaction)
    private readonly feedbackReactionRepo: Repository<FeedbackReaction>,
    @InjectRepository(AiModerationLog)
    private readonly moderationLogRepo: Repository<AiModerationLog>,
    private readonly cloudinary: CloudinaryService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async checkContent(userId: number, content: string) {
    const trimmed = content?.trim();
    if (!trimmed) {
      return { decision: 'approved', reasons: [] };
    }

    let aiResult;
    try {
      aiResult = await this.coordinateModeration(trimmed);
    } catch (e) {
      console.error('Moderation API failed', e);
      // Fallback: approve if AI fails? or allow manual?
      // For now, return a safe fallback but log error
      aiResult = { decision: 'approved', reasons: ['ai_error'] };
    }

    // Save log
    const log = this.moderationLogRepo.create({
      content: trimmed,
      aiResponse: aiResult,
      decision: aiResult.decision,
      userId,
    });
    await this.moderationLogRepo.save(log);

    return aiResult;
  }

  async create(
    userId: number,
    dto: CreateFeedbackDto,
    mediaFiles?: { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ): Promise<Feedback> {
    const resolved = await this.processMedia(dto, mediaFiles);
    
    // No internal moderation here anymore.
    
    const feedback = new Feedback();
    
    // Assign user directly from JWT
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    feedback.user = user;

    await this.assignFeedbackFields(feedback, resolved);
    const saved = await this.feedbackRepo.save(feedback);
    await this.recalculateDestinationRating(saved.destination?.id);
    await this.recalculateTravelRouteRating(saved.travelRoute?.id);
    return this.findOne(saved.id);
  }

  // Helper to call AI
  async coordinateModeration(text: string) {
     const baseUrl =
      this.configService.get<string>('AI_REVIEW_BASE_URL') ??
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';
    
    const observable = this.httpService.post(`${baseUrl}/moderation/predict`, {
      text,
    });
    const response: AxiosResponse = await lastValueFrom(observable);
    return response.data;
  }

  async findAll(options: FeedbackQueryOptions = {}): Promise<Feedback[]> {
    const {
      userId,
      destinationId,
      travelRouteId,
      status, // This param might be redundant now if we don't have status col, but let's see logic
      limit = 50,
      offset = 0,
    } = options;
    const qb = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.destination', 'destination')
      .leftJoinAndSelect('feedback.travelRoute', 'travelRoute')
      .leftJoinAndSelect('feedback.rentalVehicle', 'rentalVehicle')
      .leftJoinAndSelect('feedback.cooperation', 'cooperation')
      .take(limit)
      .skip(offset)
      .orderBy('feedback.createdAt', 'DESC');

    if (userId) {
      qb.andWhere('feedback.user_id = :userId', { userId });
    }

    if (destinationId) {
      qb.andWhere('feedback.destination_id = :destinationId', {
        destinationId,
      });
    }

    if (travelRouteId) {
      qb.andWhere('feedback.travel_route_id = :travelRouteId', {
        travelRouteId,
      });
    }

    // if (status) { ... } -> Status column removed, so filter is invalid. Removing logic.

    return qb.getMany();
  }

  async findOne(id: number): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: {
        user: true,
        destination: true,
        travelRoute: true,
        rentalVehicle: true,
        cooperation: true,
        replies: { user: true },
        reactions: true,
      },
    });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    return feedback;
  }


  async remove(id: number): Promise<{ id: number; message: string }> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: { destination: true, travelRoute: true },
    });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    const destinationId = feedback.destination?.id;
    const travelRouteId = feedback.travelRoute?.id;
    await this.feedbackRepo.remove(feedback);
    if (destinationId) {
      await this.recalculateDestinationRating(destinationId);
    }
    if (travelRouteId) {
      await this.recalculateTravelRouteRating(travelRouteId);
    }
    return { id, message: 'Feedback deleted' };
  }

  private async recalculateTravelRouteRating(
    travelRouteId?: number,
  ): Promise<void> {
    if (!travelRouteId) return;

    const aggregation = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .select('COUNT(feedback.id)', 'count')
      .addSelect('COALESCE(SUM(feedback.star), 0)', 'sum')
      .where('feedback.travel_route_id = :travelRouteId', { travelRouteId })
      // Removed status check
      .getRawOne<{ count: string; sum: string }>();

    const count = Number(aggregation?.count ?? 0);
    const sum = Number(aggregation?.sum ?? 0);

    const travelRoute = await this.travelRouteRepo.findOne({
      where: { id: travelRouteId },
    });
    if (!travelRoute) return;

    travelRoute.averageRating =
      count > 0 ? Number((sum / count).toFixed(2)) : 0;

    await this.travelRouteRepo.save(travelRoute);
  }

  private async assignFeedbackFields(
    feedback: Feedback,
    dto: Partial<CreateFeedbackDto>,
  ): Promise<void> {
    // ... existing logic ...
    // userId is handled by the caller (create method)
    if (dto.travelRouteId) {
      const route = await this.travelRouteRepo.findOne({
        where: { id: dto.travelRouteId },
      });
      if (!route) {
        throw new NotFoundException(
          `Travel route ${dto.travelRouteId} not found`,
        );
      }
      feedback.travelRoute = route;
    } else if (dto.travelRouteId === null) {
      feedback.travelRoute = undefined;
    }

    if (dto.destinationId) {
      const destination = await this.destinationRepo.findOne({
        where: { id: dto.destinationId },
      });
      if (!destination) {
        throw new NotFoundException(
          `Destination ${dto.destinationId} not found`,
        );
      }
      feedback.destination = destination;
    }

    if (dto.destinationId === null) {
      feedback.destination = undefined;
    }

    if (dto.licensePlate) {
      const vehicle = await this.rentalVehicleRepo.findOne({
        where: { licensePlate: dto.licensePlate },
      });
      if (!vehicle) {
        throw new NotFoundException(
          `Rental vehicle ${dto.licensePlate} not found`,
        );
      }
      feedback.rentalVehicle = vehicle;
    } else if (dto.licensePlate === null) {
      feedback.rentalVehicle = undefined;
    }

    if (dto.cooperationId) {
      const cooperation = await this.cooperationRepo.findOne({
        where: { id: dto.cooperationId },
      });
      if (!cooperation) {
        throw new NotFoundException(
          `Cooperation ${dto.cooperationId} not found`,
        );
      }
      feedback.cooperation = cooperation;
    } else if (dto.cooperationId === null) {
      feedback.cooperation = undefined;
    }

    if (dto.star !== undefined) {
      feedback.star = dto.star;
    }

    if (dto.comment !== undefined) {
      feedback.comment = dto.comment;
    }
    if (dto.photos !== undefined) {
      feedback.photos = dto.photos ?? [];
    }

    if (dto.videos !== undefined) {
      feedback.videos = dto.videos ?? [];
    }
  }

  async findByObject(params: {
    destinationId?: number;
    travelRouteId?: number;
    cooperationId?: number;
    licensePlate?: string;
    status?: string;
  }): Promise<Feedback[]> {
    const qb = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.destination', 'destination')
      .leftJoinAndSelect('feedback.travelRoute', 'travelRoute')
      .leftJoinAndSelect('feedback.rentalVehicle', 'rentalVehicle')
      .leftJoinAndSelect('feedback.cooperation', 'cooperation')
      .orderBy('feedback.createdAt', 'DESC');

    if (params.destinationId) {
      qb.andWhere('feedback.destination_id = :destinationId', {
        destinationId: params.destinationId,
      });
    }
    if (params.travelRouteId) {
      qb.andWhere('feedback.travel_route_id = :travelRouteId', {
        travelRouteId: params.travelRouteId,
      });
    }
    if (params.cooperationId) {
      qb.andWhere('feedback.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    if (params.licensePlate) {
      qb.andWhere('feedback.licensePlate = :licensePlate', {
        licensePlate: params.licensePlate,
      });
    }
    // removed status filter

    return qb.getMany();
  }

  async getAuthorForService(params: {
    destinationId?: number;
    travelRouteId?: number;
    cooperationId?: number;
    licensePlate?: string;
  }): Promise<User | null> {
    const qb = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .orderBy('feedback.createdAt', 'ASC')
      .take(1);

    if (params.destinationId) {
      qb.where('feedback.destination_id = :destinationId', {
        destinationId: params.destinationId,
      });
    } else if (params.travelRouteId) {
      qb.where('feedback.travel_route_id = :travelRouteId', {
        travelRouteId: params.travelRouteId,
      });
    } else if (params.cooperationId) {
      qb.where('feedback.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    } else if (params.licensePlate) {
      qb.where('feedback.licensePlate = :licensePlate', {
        licensePlate: params.licensePlate,
      });
    } else {
      return null;
    }

    const record = await qb.getOne();
    return record?.user ?? null;
  }

  async addReaction(
    feedbackId: number,
    userId: number,
    type: FeedbackReactionType = FeedbackReactionType.LIKE,
  ): Promise<FeedbackReaction> {
    const feedback = await this.feedbackRepo.findOne({ where: { id: feedbackId } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${feedbackId} not found`);
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const existing = await this.feedbackReactionRepo.findOne({
      where: { feedback: { id: feedbackId }, user: { id: userId }, type },
    });
    if (existing) {
      return existing;
    }
    const reaction = this.feedbackReactionRepo.create({
      feedback,
      user,
      type,
    });
    const saved = await this.feedbackReactionRepo.save(reaction);

    return saved;
  }

  async removeReaction(
    feedbackId: number,
    userId: number,
    type: FeedbackReactionType = FeedbackReactionType.LIKE,
  ): Promise<void> {
    await this.feedbackReactionRepo.delete({
      feedback: { id: feedbackId },
      user: { id: userId },
      type,
    });
  }


  async listReactions(feedbackId: number): Promise<
    {
      type: FeedbackReactionType;
      count: number;
    }[]
  > {
    const rows = await this.feedbackReactionRepo
      .createQueryBuilder('reaction')
      .select('reaction.type', 'type')
      .addSelect('COUNT(reaction.id)', 'count')
      .where('reaction.feedback_id = :feedbackId', { feedbackId })
      .groupBy('reaction.type')
      .getRawMany<{ type: FeedbackReactionType; count: string }>();
    return rows.map((r) => ({ type: r.type, count: Number(r.count) }));
  }

  private async recalculateDestinationRating(
    destinationId?: number,
  ): Promise<void> {
    if (!destinationId) return;

    const aggregation = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .select('COUNT(feedback.id)', 'count')
      .addSelect('COALESCE(SUM(feedback.star), 0)', 'sum')
      .where('feedback.destination_id = :destinationId', { destinationId })
      // Removed status check
      .getRawOne<{ count: string; sum: string }>();

    const count = Number(aggregation?.count ?? 0);
    const sum = Number(aggregation?.sum ?? 0);

    const destination = await this.destinationRepo.findOne({
      where: { id: destinationId },
    });
    if (!destination) return;

    if (count > 0) {
      destination.userRatingsTotal = count;
      destination.rating = Number((sum / count).toFixed(2));
    } else {
      destination.userRatingsTotal = 0;
      destination.rating = 0;
    }

    await this.destinationRepo.save(destination);
  }

  // moderateComment removed or replaced by coordinateModeration


  private async processMedia(
    dto: CreateFeedbackDto,
    mediaFiles?: { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ): Promise<CreateFeedbackDto> {
    const photos = mediaFiles?.photos ?? [];
    const videos = mediaFiles?.videos ?? [];

    const uploadedPhotos = await Promise.all(
      photos.map((file) =>
        this.cloudinary.uploadImage(file, {
          folder: 'traveline/feedbacks/photos',
        }),
      ),
    );

    const uploadedVideos = await Promise.all(
      videos.map((file) =>
        this.cloudinary.uploadVideo(file, {
          folder: 'traveline/feedbacks/videos',
        }),
      ),
    );

    return {
      ...dto,
      photos: [...(dto.photos ?? []), ...uploadedPhotos.map((p) => p.url)],
      videos: [...(dto.videos ?? []), ...uploadedVideos.map((v) => v.url)],
    };
  }

  async createReply(
    feedbackId: number,
    userId: number,
    dto: CreateReplyDto,
  ): Promise<FeedbackReply> {
    const feedback = await this.feedbackRepo.findOne({ where: { id: feedbackId } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${feedbackId} not found`);
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const reply = this.replyRepo.create({
      feedback,
      user,
      content: dto.content,
    });
    return this.replyRepo.save(reply);
  }

  async listReplies(feedbackId: number): Promise<FeedbackReply[]> {
    return this.replyRepo.find({
      where: { feedback: { id: feedbackId } },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }
}
