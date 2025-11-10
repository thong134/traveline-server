import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TravelRoute } from './travel-route.entity';
import { RouteStop, RouteStopStatus } from './route-stop.entity';
import { CreateTravelRouteDto } from './dto/create-travel-route.dto';
import { UpdateTravelRouteDto } from './dto/update-travel-route.dto';
import { RouteStopDto } from './dto/route-stop.dto';
import { Destination } from '../destinations/destinations.entity';
import { User } from '../users/entities/user.entity';

interface TravelRouteQueryOptions {
  q?: string;
  userId?: number;
  province?: string;
}

@Injectable()
export class TravelRoutesService {
  constructor(
    @InjectRepository(TravelRoute)
    private readonly routeRepo: Repository<TravelRoute>,
    @InjectRepository(RouteStop)
    private readonly stopRepo: Repository<RouteStop>,
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTravelRouteDto): Promise<TravelRoute> {
    return this.dataSource.transaction(async (manager) => {
      const route = await this.prepareRouteEntity(
        dto,
        manager.getRepository(User),
      );
      const savedRoute = await manager.getRepository(TravelRoute).save(route);

      if (dto.stops?.length) {
        const stops = await this.prepareStops(
          dto.stops,
          savedRoute.id,
          manager.getRepository(Destination),
          savedRoute.startDate ?? undefined,
        );
        await manager.getRepository(RouteStop).save(stops);
        await this.updateRouteAggregates(savedRoute.id, manager);
      }

      return this.findOne(savedRoute.id);
    });
  }

  async findAll(options: TravelRouteQueryOptions = {}): Promise<TravelRoute[]> {
    const { q, userId, province } = options;
    const qb = this.routeRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.stops', 'stops')
      .leftJoinAndSelect('route.user', 'user');

    if (q) {
      qb.andWhere('route.name ILIKE :q', { q: `%${q}%` });
    }

    if (userId) {
      qb.andWhere('route.userId = :userId', { userId });
    }

    if (province) {
      qb.andWhere('route.province = :province', { province });
    }

    qb.orderBy('route.createdAt', 'DESC')
      .addOrderBy('stops.dayOrder', 'ASC')
      .addOrderBy('stops.sequence', 'ASC');

    return qb.getMany();
  }

  async findOne(id: number): Promise<TravelRoute> {
    const route = await this.routeRepo.findOne({
      where: { id },
      relations: { stops: true, user: true },
      order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
    });
    if (!route) {
      throw new NotFoundException(`Travel route ${id} not found`);
    }
    return route;
  }

  async update(id: number, dto: UpdateTravelRouteDto): Promise<TravelRoute> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TravelRoute);
      const route = await repo.findOne({ where: { id } });
      if (!route) {
        throw new NotFoundException(`Travel route ${id} not found`);
      }

      await this.assignRouteFields(route, dto, manager.getRepository(User));
      await repo.save(route);

      if (dto.stops) {
        await manager.getRepository(RouteStop).delete({ routeId: id });
        if (dto.stops.length) {
          const stops = await this.prepareStops(
            dto.stops,
            id,
            manager.getRepository(Destination),
            route.startDate ?? undefined,
          );
          await manager.getRepository(RouteStop).save(stops);
          await this.updateRouteAggregates(id, manager);
        } else {
          await this.updateRouteAggregates(id, manager);
        }
      }

      return this.findOne(id);
    });
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) {
      throw new NotFoundException(`Travel route ${id} not found`);
    }
    await this.routeRepo.remove(route);
    return { id, message: 'Travel route deleted' };
  }

  private async prepareRouteEntity(
    dto: CreateTravelRouteDto,
    userRepository: Repository<User>,
  ): Promise<TravelRoute> {
    const route = new TravelRoute();
    await this.assignRouteFields(route, dto, userRepository);
    return route;
  }

  private async assignRouteFields(
    route: TravelRoute,
    dto: Partial<CreateTravelRouteDto>,
    userRepository: Repository<User>,
  ): Promise<void> {
    const {
      userId,
      ownerUid,
      name,
      province,
      numberOfDays,
      startDate,
      endDate,
    } = dto;

    if (userId) {
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      route.userId = userId;
      route.user = user;
    } else if (dto.userId === null) {
      route.user = undefined;
      route.userId = undefined;
    }

    if (ownerUid !== undefined) {
      route.ownerUid = ownerUid;
    }

    if (name !== undefined) {
      route.name = name;
    }

    if (province !== undefined) {
      route.province = province;
    }

    if (startDate !== undefined) {
      route.startDate = startDate ? new Date(startDate) : undefined;
    }

    if (endDate !== undefined) {
      route.endDate = endDate ? new Date(endDate) : undefined;
    }

    const computedDays = this.computeNumberOfDays(dto.stops, numberOfDays);
    route.numberOfDays = computedDays;
  }

  private computeNumberOfDays(
    stops?: RouteStopDto[],
    fallback?: number,
  ): number {
    if (stops?.length) {
      const maxDay = Math.max(...stops.map((stop) => stop.dayOrder));
      return Math.max(1, maxDay);
    }
    if (fallback) {
      return fallback;
    }
    return 1;
  }

  private async prepareStops(
    dtos: RouteStopDto[],
    routeId: number,
    destinationRepository: Repository<Destination>,
    routeStartDate?: Date,
  ): Promise<RouteStop[]> {
    const stops: RouteStop[] = [];

    for (const dto of dtos) {
      const stop = new RouteStop();
      stop.routeId = routeId;
      stop.dayOrder = dto.dayOrder;
      stop.sequence = dto.sequence;
      stop.uniqueKey = dto.uniqueKey;
      stop.startTime = dto.startTime;
      stop.endTime = dto.endTime;
      stop.notes = dto.notes;
      stop.images = dto.images ?? [];
      stop.videos = dto.videos ?? [];
      const status = this.determineStopStatus(
        routeStartDate,
        dto.dayOrder,
        dto.status,
      );
      stop.status = status;
      stop.travelPoints = this.resolveTravelPoints(status, dto.travelPoints);

      if (dto.destinationId) {
        const destination = await destinationRepository.findOne({
          where: { id: dto.destinationId },
        });
        if (!destination) {
          throw new NotFoundException(
            `Destination ${dto.destinationId} not found`,
          );
        }
        stop.destinationId = destination.id;
        stop.destination = destination;
      }

      stops.push(stop);
    }

    return stops;
  }

  private determineStopStatus(
    routeStartDate: Date | undefined,
    dayOrder: number,
    providedStatus?: RouteStopStatus,
  ): RouteStopStatus {
    if (providedStatus) {
      return providedStatus;
    }
    if (!routeStartDate) {
      return RouteStopStatus.UPCOMING;
    }

    const stopDate = new Date(routeStartDate);
    stopDate.setHours(0, 0, 0, 0);
    stopDate.setDate(stopDate.getDate() + Math.max(0, dayOrder - 1));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (stopDate > today) {
      return RouteStopStatus.UPCOMING;
    }
    if (stopDate.getTime() === today.getTime()) {
      return RouteStopStatus.IN_PROGRESS;
    }
    return RouteStopStatus.MISSED;
  }

  private resolveTravelPoints(
    status: RouteStopStatus,
    requestedPoints?: number,
  ): number {
    if (status === RouteStopStatus.COMPLETED) {
      if (requestedPoints !== undefined) {
        return Math.max(0, requestedPoints);
      }
      return 50;
    }
    return 0;
  }

  private async updateRouteAggregates(
    routeId: number,
    manager: EntityManager,
  ): Promise<void> {
    const stopRepo = manager.getRepository(RouteStop);
    const aggregation = await stopRepo
      .createQueryBuilder('stop')
      .select('COALESCE(SUM(stop.travelPoints), 0)', 'total')
      .where('stop.routeId = :routeId', { routeId })
      .getRawOne<{ total: string }>();

    const totalPoints = Number(aggregation?.total ?? 0);

    await manager.getRepository(TravelRoute).update(routeId, {
      totalTravelPoints: totalPoints,
    });
  }
}
