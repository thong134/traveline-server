import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { User } from '../users/entities/user.entity';
import { Destination } from '../destinations/destinations.entity';
import { TravelRoute } from '../travel-routes/travel-route.entity';

interface FeedbackQueryOptions {
  userId?: number;
  destinationId?: number;
  destinationExternalId?: string;
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
  ) {}

  async create(dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = new Feedback();
    await this.assignFeedbackFields(feedback, dto);
    const saved = await this.feedbackRepo.save(feedback);
    await this.recalculateDestinationRating(saved.destinationId);
    return this.findOne(saved.id);
  }

  async findAll(options: FeedbackQueryOptions = {}): Promise<Feedback[]> {
    const {
      userId,
      destinationId,
      destinationExternalId,
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
      .take(limit)
      .skip(offset)
      .orderBy('feedback.createdAt', 'DESC');

    if (userId) {
      qb.andWhere('feedback.userId = :userId', { userId });
    }

    if (destinationId) {
      qb.andWhere('feedback.destinationId = :destinationId', { destinationId });
    }

    if (destinationExternalId) {
      qb.andWhere('feedback.destinationExternalId = :destinationExternalId', {
        destinationExternalId,
      });
    }

    if (travelRouteId) {
      qb.andWhere('feedback.travelRouteId = :travelRouteId', { travelRouteId });
    }

    if (status) {
      qb.andWhere('feedback.status = :status', { status });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: { user: true, destination: true, travelRoute: true },
    });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    return feedback;
  }

  async update(id: number, dto: UpdateFeedbackDto): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    const previousDestinationId = feedback.destinationId;
    await this.assignFeedbackFields(feedback, dto);
    await this.feedbackRepo.save(feedback);
    if (feedback.destinationId || previousDestinationId) {
      await this.recalculateDestinationRating(
        feedback.destinationId ?? previousDestinationId ?? undefined,
      );
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    const destinationId = feedback.destinationId;
    await this.feedbackRepo.remove(feedback);
    if (destinationId) {
      await this.recalculateDestinationRating(destinationId);
    }
    return { id, message: 'Feedback deleted' };
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
      feedback.userId = user.id;
      feedback.user = user;
    } else if (dto.userId === null) {
      feedback.user = undefined;
      feedback.userId = undefined;
    }

    if (dto.userUid !== undefined) {
      feedback.userUid = dto.userUid;
    }

    if (dto.externalId !== undefined) {
      feedback.externalId = dto.externalId;
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
      feedback.travelRouteId = route.id;
      feedback.travelRoute = route;
    } else if (dto.travelRouteId === null) {
      feedback.travelRouteId = undefined;
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
      feedback.destinationId = destination.id;
      feedback.destination = destination;
      feedback.destinationExternalId =
        destination.externalId ?? feedback.destinationExternalId;
    } else if (dto.destinationExternalId) {
      feedback.destinationExternalId = dto.destinationExternalId;
      const destination = await this.destinationRepo.findOne({
        where: { externalId: dto.destinationExternalId },
      });
      if (destination) {
        feedback.destinationId = destination.id;
        feedback.destination = destination;
      }
    }

    if (dto.destinationId === null && dto.destinationExternalId === null) {
      feedback.destinationId = undefined;
      feedback.destination = undefined;
      feedback.destinationExternalId = undefined;
    }

    if (dto.licensePlate !== undefined) {
      feedback.licensePlate = dto.licensePlate;
    }

    if (dto.cooperationId !== undefined) {
      feedback.cooperationId = dto.cooperationId;
    }

    if (dto.star !== undefined) {
      feedback.star = dto.star;
    }

    if (dto.comment !== undefined) {
      feedback.comment = dto.comment;
    }

    if (dto.date !== undefined) {
      feedback.feedbackDate = dto.date ? new Date(dto.date) : undefined;
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
}
