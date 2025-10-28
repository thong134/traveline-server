import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TravelRoute } from './travel-route.entity';
import { RouteStop } from './route-stop.entity';
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
        );
        await manager.getRepository(RouteStop).save(stops);
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
          );
          await manager.getRepository(RouteStop).save(stops);
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
      externalId,
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

    if (externalId !== undefined) {
      route.externalId = externalId;
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
      stop.destinationExternalId = dto.destinationExternalId;

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
        stop.destinationExternalId =
          destination.externalId ?? stop.destinationExternalId;
      } else if (dto.destinationExternalId) {
        const destination = await destinationRepository.findOne({
          where: { externalId: dto.destinationExternalId },
        });
        if (destination) {
          stop.destinationId = destination.id;
          stop.destination = destination;
        }
      }

      stops.push(stop);
    }

    return stops;
  }
}
