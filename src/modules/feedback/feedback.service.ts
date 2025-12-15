import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
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

interface FeedbackQueryOptions {
  userId?: number;
  destinationId?: number;
  travelRouteId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}

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
    private readonly cloudinary: CloudinaryService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreateFeedbackDto,
    mediaFiles?: { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ): Promise<Feedback> {
    const resolved = await this.processMedia(dto, mediaFiles);
    const moderated = await this.applyModeration(resolved);
    const feedback = new Feedback();
    await this.assignFeedbackFields(feedback, moderated);
    const saved = await this.feedbackRepo.save(feedback);
    await this.recalculateDestinationRating(saved.destination?.id);
    await this.recalculateTravelRouteRating(saved.travelRoute?.id);
    return this.findOne(saved.id);
  }

  async findAll(options: FeedbackQueryOptions = {}): Promise<Feedback[]> {
    const {
      userId,
      destinationId,
      travelRouteId,
      status,
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

    if (status) {
      qb.andWhere('feedback.status = :status', { status });
    }

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
      },
    });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    return feedback;
  }

  async update(id: number, dto: UpdateFeedbackDto): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: {
        user: true,
        destination: true,
        travelRoute: true,
        rentalVehicle: true,
        cooperation: true,
      },
    });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    const previousDestinationId = feedback.destination?.id;
    const previousTravelRouteId = feedback.travelRoute?.id;
    await this.assignFeedbackFields(feedback, dto);
    await this.feedbackRepo.save(feedback);
    if (feedback.destination?.id || previousDestinationId) {
      await this.recalculateDestinationRating(
        feedback.destination?.id ?? previousDestinationId ?? undefined,
      );
    }
    if (feedback.travelRoute?.id || previousTravelRouteId) {
      await this.recalculateTravelRouteRating(
        feedback.travelRoute?.id ?? previousTravelRouteId ?? undefined,
      );
    }
    return this.findOne(id);
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
      .andWhere('feedback.status IN (:...statuses)', {
        statuses: ['pending', 'approved'],
      })
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
    if (dto.userId) {
      const user = await this.userRepo.findOne({ where: { id: dto.userId } });
      if (!user) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }
      feedback.user = user;
    } else if (dto.userId === null) {
      feedback.user = undefined;
    }

    if (dto.userUid !== undefined) {
      feedback.userUid = dto.userUid;
    }

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

    if (dto.status !== undefined) {
      feedback.status = dto.status;
    }
  }

  private async recalculateDestinationRating(
    destinationId?: number,
  ): Promise<void> {
    if (!destinationId) return;

    const aggregation = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .select('COUNT(feedback.id)', 'count')
      .addSelect('COALESCE(SUM(feedback.star), 0)', 'sum')
      .where('feedback.destinationId = :destinationId', { destinationId })
      .andWhere('feedback.status IN (:...statuses)', {
        statuses: ['pending', 'approved'],
      })
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

  async moderateComment(comment?: string) {
    const baseUrl =
      this.configService.get<string>('AI_REVIEW_BASE_URL') ??
      'http://localhost:8000';
    const trimmed = comment?.trim();
    if (!trimmed) {
      throw new BadRequestException('comment is required');
    }
    const observable = this.httpService.post(`${baseUrl}/review`, {
      comment: trimmed,
    });
    const response: AxiosResponse = await lastValueFrom(observable);
    return response.data;
  }

  private async applyModeration(
    dto: CreateFeedbackDto,
  ): Promise<CreateFeedbackDto> {
    if (!dto.comment) return dto;
    try {
      const result = await this.moderateComment(dto.comment);
      const decision: string = result?.decision;
      if (decision === 'reject') {
        dto.status = 'rejected';
      } else if (decision === 'manual_review') {
        dto.status = dto.status ?? 'pending';
      } else if (decision === 'approve') {
        dto.status = dto.status ?? 'approved';
      }
      return dto;
    } catch {
      // Nếu moderation lỗi, vẫn cho phép tạo nhưng giữ status mặc định
      return dto;
    }
  }

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
}
