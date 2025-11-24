import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TravelRoute } from './entities/travel-route.entity';
import { RouteStop, RouteStopStatus } from './entities/route-stop.entity';
import { CreateTravelRouteDto } from './dto/create-travel-route.dto';
import { UpdateTravelRouteDto } from './dto/update-travel-route.dto';
import { RouteStopDto } from './dto/route-stop.dto';
import { Destination } from '../destination/entities/destinations.entity';
import { User } from '../user/entities/user.entity';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { assertImageFile, assertVideoFile } from '../../common/upload/image-upload.utils';
import { randomUUID } from 'crypto';
import type { Express } from 'express';

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
    private readonly cloudinaryService: CloudinaryService,
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

  async updateStopTime(
    routeId: number,
    stopId: number,
    payload: { startTime?: string; endTime?: string },
  ): Promise<RouteStop> {
    await this.dataSource.transaction(async (manager) => {
      const stop = await this.getStopOrFail(routeId, stopId, manager);

      if (payload.startTime !== undefined) {
        stop.startTime = payload.startTime;
      }

      if (payload.endTime !== undefined) {
        stop.endTime = payload.endTime;
      }

      await manager.getRepository(RouteStop).save(stop);
    });

    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async updateStopDetails(
    routeId: number,
    stopId: number,
    payload: {
      notes?: string;
      travelPoints?: number;
      uniqueKey?: string;
      destinationId?: number;
    },
  ): Promise<RouteStop> {
    await this.dataSource.transaction(async (manager) => {
      const stopRepo = manager.getRepository(RouteStop);
      const stop = await this.getStopOrFail(routeId, stopId, manager);

      if (payload.destinationId !== undefined) {
        const destination = await manager
          .getRepository(Destination)
          .findOne({ where: { id: payload.destinationId } });
        if (!destination) {
          throw new NotFoundException(
            `Destination ${payload.destinationId} not found`,
          );
        }
        stop.destination = destination;
        stop.destinationId = destination.id;
      }

      if (payload.notes !== undefined) {
        stop.notes = payload.notes;
      }

      if (payload.travelPoints !== undefined) {
        stop.travelPoints = Math.max(0, payload.travelPoints);
      }

      if (payload.uniqueKey !== undefined) {
        stop.uniqueKey = payload.uniqueKey;
      }

      await stopRepo.save(stop);

      if (payload.travelPoints !== undefined) {
        await this.updateRouteAggregates(routeId, manager);
      }
    });

    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async reorderStop(
    routeId: number,
    stopId: number,
    payload: { dayOrder?: number; sequence: number },
  ): Promise<RouteStop> {
    await this.dataSource.transaction(async (manager) => {
      const stopRepo = manager.getRepository(RouteStop);
      const routeRepo = manager.getRepository(TravelRoute);
      const stops = await stopRepo.find({
        where: { routeId },
        order: { dayOrder: 'ASC', sequence: 'ASC' },
      });

      const currentIndex = stops.findIndex((stop) => stop.id === stopId);
      if (currentIndex === -1) {
        throw new NotFoundException(
          `Route stop ${stopId} not found in route ${routeId}`,
        );
      }

      const target = stops[currentIndex];
      const oldDay = target.dayOrder;
      const newDay = payload.dayOrder ?? target.dayOrder;
      const newSequence = Math.max(1, payload.sequence);

      const remaining = stops.filter((stop) => stop.id !== stopId);
      const grouped = new Map<number, RouteStop[]>();
      for (const stop of remaining) {
        const entries = grouped.get(stop.dayOrder) ?? [];
        entries.push(stop);
        grouped.set(stop.dayOrder, entries);
      }

      const dayStops = grouped.get(newDay) ?? [];
      target.dayOrder = newDay;
      const insertIndex = Math.min(newSequence - 1, dayStops.length);
      dayStops.splice(insertIndex, 0, target);
      grouped.set(newDay, dayStops);

      if (oldDay !== newDay) {
        const oldDayStops = grouped.get(oldDay);
        if (oldDayStops) {
          grouped.set(oldDay, oldDayStops);
        }
      }

      const updated: RouteStop[] = [];
      const sortedDays = Array.from(grouped.keys()).sort((a, b) => a - b);
      for (const day of sortedDays) {
        const stopsInDay = grouped.get(day) ?? [];
        stopsInDay.forEach((stop, index) => {
          stop.dayOrder = day;
          stop.sequence = index + 1;
          updated.push(stop);
        });
      }

      await stopRepo.save(updated);

      const maxDay = updated.length
        ? Math.max(...updated.map((stop) => stop.dayOrder))
        : newDay;
      await routeRepo.update(routeId, {
        numberOfDays: Math.max(1, maxDay),
      });
    });

    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async updateStopStatus(
    routeId: number,
    stopId: number,
    status: RouteStopStatus,
  ): Promise<RouteStop> {
    await this.dataSource.transaction(async (manager) => {
      const stopRepo = manager.getRepository(RouteStop);
      const stop = await this.getStopOrFail(routeId, stopId, manager);
      stop.status = status;
      stop.travelPoints = this.resolveTravelPoints(status, stop.travelPoints);
      await stopRepo.save(stop);
      await this.updateRouteAggregates(routeId, manager);
    });

    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async uploadStopMedia(
    routeId: number,
    stopId: number,
    files: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ): Promise<RouteStop> {
    await this.dataSource.transaction(async (manager) => {
      const stopRepo = manager.getRepository(RouteStop);
      const stop = await this.getStopOrFail(routeId, stopId, manager);

      const images = files.images ?? [];
      const videos = files.videos ?? [];

      if (!images.length && !videos.length) {
        return;
      }

      const folder = `traveline/travel-routes/${routeId}/stops/${stopId}`;

      for (const file of images) {
        assertImageFile(file, { fieldName: 'images' });
        const upload = await this.cloudinaryService.uploadImage(file, {
          folder,
          publicId: `${Date.now()}_${randomUUID()}`,
        });
        stop.images = [...(stop.images ?? []), upload.url];
      }

      for (const file of videos) {
        assertVideoFile(file, { fieldName: 'videos' });
        const upload = await this.cloudinaryService.uploadVideo(file, {
          folder,
          publicId: `${Date.now()}_${randomUUID()}`,
        });
        stop.videos = [...(stop.videos ?? []), upload.url];
      }

      await stopRepo.save(stop);
    });

    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async checkInStop(
    routeId: number,
    stopId: number,
    latitude: number,
    longitude: number,
    toleranceMeters = 100,
  ): Promise<{ matched: boolean; distanceMeters: number; stop: RouteStop }> {
    const result = await this.dataSource.transaction(
      async (manager): Promise<{
        matched: boolean;
        distanceMeters: number;
        stop: RouteStop;
      }> => {
        const stopRepo = manager.getRepository(RouteStop);
        const stop = await this.getStopOrFail(routeId, stopId, manager, {
          withDestination: true,
        });

        if (!stop.destination || stop.destination.latitude == null) {
          throw new BadRequestException('Điểm dừng chưa liên kết địa điểm');
        }

        if (stop.destination.longitude == null) {
          throw new BadRequestException('Địa điểm thiếu thông tin kinh độ');
        }

        const distance = this.calculateDistanceMeters(
          latitude,
          longitude,
          stop.destination.latitude,
          stop.destination.longitude,
        );

        const matched = distance <= toleranceMeters;

        if (matched) {
          stop.status = RouteStopStatus.COMPLETED;
          stop.travelPoints = this.resolveTravelPoints(
            RouteStopStatus.COMPLETED,
            stop.travelPoints,
          );
          await stopRepo.save(stop);
          await this.updateRouteAggregates(routeId, manager);
        }

        return { matched, distanceMeters: distance, stop };
      },
    );

    const refreshed = await this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });

    return {
      matched: result.matched,
      distanceMeters: result.distanceMeters,
      stop: refreshed,
    };
  }

  private async prepareRouteEntity(
    dto: CreateTravelRouteDto,
    userRepository: Repository<User>,
  ): Promise<TravelRoute> {
    const route = new TravelRoute();
    await this.assignRouteFields(route, dto, userRepository);
    return route;
  }

  private async getStopOrFail(
    routeId: number,
    stopId: number,
    manager?: EntityManager,
    options: { withDestination?: boolean } = {},
  ): Promise<RouteStop> {
    const repo = manager?.getRepository(RouteStop) ?? this.stopRepo;
    const stop = await repo.findOne({
      where: { id: stopId, routeId },
      relations: options.withDestination ? { destination: true } : undefined,
    });

    if (!stop) {
      throw new NotFoundException(
        `Route stop ${stopId} not found in route ${routeId}`,
      );
    }

    return stop;
  }

  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private async assignRouteFields(
    route: TravelRoute,
    dto: Partial<CreateTravelRouteDto>,
    userRepository: Repository<User>,
  ): Promise<void> {
    const { userId, name, province, numberOfDays, startDate, endDate } = dto;

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
      stop.images = [];
      stop.videos = [];
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
      if (requestedPoints !== undefined && requestedPoints > 0) {
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
