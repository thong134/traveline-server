import { Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  async create(dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = new Feedback();
    await this.assignFeedbackFields(feedback, dto);
    const saved = await this.feedbackRepo.save(feedback);
    await this.recalculateDestinationRating(saved.destinationId);
    await this.recalculateTravelRouteRating(saved.travelRouteId);
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
      qb.andWhere('feedback.userId = :userId', { userId });
    }

    if (destinationId) {
      qb.andWhere('feedback.destinationId = :destinationId', { destinationId });
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
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    const previousDestinationId = feedback.destinationId;
    const previousTravelRouteId = feedback.travelRouteId;
    await this.assignFeedbackFields(feedback, dto);
    await this.feedbackRepo.save(feedback);
    if (feedback.destinationId || previousDestinationId) {
      await this.recalculateDestinationRating(
        feedback.destinationId ?? previousDestinationId ?? undefined,
      );
    }
    if (feedback.travelRouteId || previousTravelRouteId) {
      await this.recalculateTravelRouteRating(
        feedback.travelRouteId ?? previousTravelRouteId ?? undefined,
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
    const travelRouteId = feedback.travelRouteId;
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
      .where('feedback.travelRouteId = :travelRouteId', { travelRouteId })
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
      feedback.userId = user.id;
      feedback.user = user;
    } else if (dto.userId === null) {
      feedback.user = undefined;
      feedback.userId = undefined;
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
    }

    if (dto.destinationId === null) {
      feedback.destinationId = undefined;
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
      feedback.licensePlate = vehicle.licensePlate;
      feedback.rentalVehicle = vehicle;
    } else if (dto.licensePlate === null) {
      feedback.licensePlate = undefined;
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
      feedback.cooperationId = cooperation.id;
      feedback.cooperation = cooperation;
    } else if (dto.cooperationId === null) {
      feedback.cooperationId = undefined;
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
}
