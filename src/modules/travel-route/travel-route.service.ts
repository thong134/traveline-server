import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TravelRoute, TravelRouteStatus } from './entities/travel-route.entity';
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
  shared?: boolean;
}

interface SharedRouteQueryOptions {
  q?: string;
  province?: string;
  limit?: number;
  offset?: number;
}

type PublicTravelRoute = {
  id: number;
  name: string;
  province?: string;
  shared: boolean;
  status: TravelRouteStatus;
  numberOfDays: number;
  totalTravelPoints: number;
  startDate?: Date;
  endDate?: Date;
  stops: {
    id: number;
    dayOrder: number;
    sequence: number;
    startTime?: string;
    endTime?: string;
    status: RouteStopStatus;
    destination?:
      | {
          id: number;
          name: string;
          province?: string;
          type?: string;
          latitude: number;
          longitude: number;
          openTime?: string;
          closeTime?: string;
        }
      | undefined;
  }[];
};

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

  async cloneRoute(routeId: number, userId: number): Promise<TravelRoute> {
    return this.dataSource.transaction(async (manager) => {
      const routeRepo = manager.getRepository(TravelRoute);
      const stopRepo = manager.getRepository(RouteStop);
      const userRepo = manager.getRepository(User);

      const source = await routeRepo.findOne({
        where: { id: routeId },
        relations: { stops: { destination: true }, user: true },
        order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
      });

      if (!source) {
        throw new NotFoundException(`Travel route ${routeId} not found`);
      }

      if (!source.shared && source.user?.id !== userId) {
        throw new ForbiddenException('Bạn không thể sao chép lộ trình này');
      }

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const clone = new TravelRoute();
      clone.name = source.name;
      clone.province = source.province;
      clone.numberOfDays = source.numberOfDays;
      clone.startDate = source.startDate ?? undefined;
      clone.endDate = source.endDate ?? undefined;
      clone.shared = false;
      clone.status = TravelRouteStatus.DRAFT;
      clone.user = user;
      clone.totalTravelPoints = 0;
      clone.averageRating = 0;

      const savedRoute = await routeRepo.save(clone);

      if (source.stops?.length) {
        const stops = source.stops.map((stop) => {
          const newStop = new RouteStop();
          newStop.route = savedRoute;
          newStop.dayOrder = stop.dayOrder;
          newStop.sequence = stop.sequence;
          newStop.startTime = stop.startTime;
          newStop.endTime = stop.endTime;
          newStop.notes = undefined; // tránh copy thông tin cá nhân
          newStop.images = [];
          newStop.videos = [];
          newStop.status = this.determineStopStatus(
            savedRoute.startDate ?? undefined,
            stop.dayOrder,
            undefined,
          );
          newStop.travelPoints = 0;
          if (stop.destination) {
            newStop.destination = stop.destination;
          }
          return newStop;
        });

        await stopRepo.save(stops);
      }

      await this.updateRouteAggregates(savedRoute.id, manager);
      return this.findOne(savedRoute.id);
    });
  }

  async create(dto: CreateTravelRouteDto): Promise<TravelRoute> {
    const savedId = await this.dataSource.transaction(async (manager) => {
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

      return savedRoute.id;
    });

    return this.findOne(savedId);
  }

  async findAll(options: TravelRouteQueryOptions = {}): Promise<TravelRoute[]> {
    const { q, userId, province, shared } = options;
    const qb = this.routeRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.stops', 'stops')
      .leftJoinAndSelect('route.user', 'user');

    if (q) {
      qb.andWhere('route.name ILIKE :q', { q: `%${q}%` });
    }

    if (userId) {
      qb.andWhere('user.id = :userId', { userId });
    }

    if (province) {
      qb.andWhere('route.province = :province', { province });
    }

    if (shared !== undefined) {
      qb.andWhere('route.shared = :shared', { shared });
    }

    qb.orderBy('route.createdAt', 'DESC')
      .addOrderBy('stops.dayOrder', 'ASC')
      .addOrderBy('stops.sequence', 'ASC');

    return qb.getMany();
  }

  async findByUser(userId: number): Promise<TravelRoute[]> {
    return this.routeRepo.find({
      where: { user: { id: userId } },
      relations: { stops: true },
      order: {
        createdAt: 'DESC',
        stops: { dayOrder: 'ASC', sequence: 'ASC' },
      },
    });
  }

  async findSharedRoutes(
    options: SharedRouteQueryOptions = {},
  ): Promise<PublicTravelRoute[]> {
    const { q, province, limit = 20, offset = 0 } = options;
    const qb = this.routeRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.stops', 'stops')
      .leftJoinAndSelect('stops.destination', 'destination')
      .where('route.shared = TRUE');

    if (q) {
      qb.andWhere('route.name ILIKE :q', { q: `%${q}%` });
    }

    if (province) {
      qb.andWhere('route.province = :province', { province });
    }

    qb
      .orderBy('route.createdAt', 'DESC')
      .addOrderBy('stops.dayOrder', 'ASC')
      .addOrderBy('stops.sequence', 'ASC')
      .take(limit)
      .skip(offset);

    const routes = await qb.getMany();

    return routes.map((route) => ({
      id: route.id,
      name: route.name,
      province: route.province,
      shared: route.shared,
      status: route.status,
      numberOfDays: route.numberOfDays,
      startDate: route.startDate ?? undefined,
      endDate: route.endDate ?? undefined,
      totalTravelPoints: route.totalTravelPoints,
      stops:
        route.stops?.map((stop) => ({
          id: stop.id,
          dayOrder: stop.dayOrder,
          sequence: stop.sequence,
          startTime: stop.startTime ?? undefined,
          endTime: stop.endTime ?? undefined,
          status: stop.status,
          destination: stop.destination
            ? {
                id: stop.destination.id,
                name: stop.destination.name,
                province: stop.destination.province,
                type: stop.destination.type,
                latitude: stop.destination.latitude,
                longitude: stop.destination.longitude,
                openTime: stop.destination.openTime,
                closeTime: stop.destination.closeTime,
              }
            : undefined,
        })) ?? [],
    }));
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

  async getStopDetail(routeId: number, stopId: number): Promise<RouteStop> {
    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async findRouteDatesByUser(
    userId: number,
  ): Promise<
    Array<{
      id: number;
      name: string;
      startDate: Date | null;
      endDate: Date | null;
      status: TravelRouteStatus;
    }>
  > {
    const routes = await this.routeRepo.find({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      where: { user: { id: userId } },
      order: { startDate: 'ASC', id: 'DESC' },
    });
    return routes.map((route) => ({
      id: route.id,
      name: route.name,
      startDate: route.startDate ?? null,
      endDate: route.endDate ?? null,
      status: route.status,
    }));
  }

  async updateShared(
    routeId: number,
    shared: boolean,
    userId: number,
  ): Promise<TravelRoute> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TravelRoute);
      const route = await repo.findOne({
        where: { id: routeId },
        relations: { user: true },
      });
      if (!route) {
        throw new NotFoundException(`Travel route ${routeId} not found`);
      }
      if (route.user?.id && route.user.id !== userId) {
        throw new ForbiddenException('Bạn không có quyền cập nhật lộ trình này');
      }

      route.shared = shared;
      await repo.save(route);
      return this.findOne(routeId);
    });
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
        await manager
          .getRepository(RouteStop)
          .createQueryBuilder()
          .delete()
          .where('route_id = :id', { id })
          .execute();
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
      const stop = await this.getStopOrFail(routeId, stopId, manager, {
        withDestination: true,
      });
      const nextStart = payload.startTime ?? stop.startTime;
      const nextEnd = payload.endTime ?? stop.endTime;

      this.validateStopTimeWindow(stop.destination, nextStart, nextEnd);

      stop.startTime = nextStart;
      stop.endTime = nextEnd;

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
      destinationId?: number;
    },
  ): Promise<RouteStop> {
    await this.dataSource.transaction(async (manager) => {
      const stopRepo = manager.getRepository(RouteStop);
      const stop = await this.getStopOrFail(routeId, stopId, manager, {
        withDestination: true,
      });
      let destination = stop.destination;

      if (payload.destinationId !== undefined) {
        const foundDestination = await manager
          .getRepository(Destination)
          .findOne({ where: { id: payload.destinationId } });
        if (!foundDestination) {
          throw new NotFoundException(
            `Destination ${payload.destinationId} not found`,
          );
        }
        destination = foundDestination;
        stop.destination = destination;
      }

      if (payload.notes !== undefined) {
        stop.notes = payload.notes;
      }

      if (payload.travelPoints !== undefined) {
        stop.travelPoints = Math.max(0, payload.travelPoints);
      }

      this.validateStopTimeWindow(
        destination,
        stop.startTime ?? undefined,
        stop.endTime ?? undefined,
      );

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
        where: { route: { id: routeId } },
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
      where: { id: stopId, route: { id: routeId } },
      relations: options.withDestination
        ? { destination: true, route: true }
        : { route: true },
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
    const {
      userId,
      name,
      province,
      numberOfDays,
      startDate,
      endDate,
      shared,
    } = dto;

    if (userId) {
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      route.user = user;
    } else if (dto.userId === null) {
      route.user = undefined;
    }

    if (name !== undefined) {
      route.name = name;
    }

    if (province !== undefined) {
      route.province = province;
    }

    const parsedStart = this.parseDateInput(startDate);
    const parsedEnd = this.parseDateInput(endDate);

    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    const maxDay =
      dto.stops?.length && dto.stops.some((s) => s?.dayOrder !== undefined)
        ? Math.max(...dto.stops.map((s) => s.dayOrder))
        : undefined;

    if (parsedStart && parsedEnd && maxDay && maxDay > 0) {
      const duration =
        Math.floor(
          (parsedEnd.getTime() - parsedStart.getTime()) / 86_400_000,
        ) + 1;
      if (duration < maxDay) {
        throw new BadRequestException(
          'Khoảng ngày (startDate - endDate) không đủ cho số dayOrder của các điểm dừng',
        );
      }
    }

    route.startDate = parsedStart;
    route.endDate = parsedEnd;

    if (shared !== undefined) {
      route.shared = shared;
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
      stop.route = { id: routeId } as TravelRoute;
      stop.dayOrder = dto.dayOrder;
      stop.sequence = dto.sequence;
      stop.startTime = dto.startTime;
      stop.endTime = dto.endTime;
      stop.notes = dto.notes;
      stop.images = [];
      stop.videos = [];
      let destination: Destination | undefined;

      if (dto.destinationId) {
        const foundDestination = await destinationRepository.findOne({
          where: { id: dto.destinationId },
        });
        if (!foundDestination) {
          throw new NotFoundException(
            `Destination ${dto.destinationId} not found`,
          );
        }
        destination = foundDestination;
        stop.destination = foundDestination;
      }

      this.validateStopTimeWindow(destination, dto.startTime, dto.endTime);

      const status = this.determineStopStatus(
        routeStartDate,
        dto.dayOrder,
        dto.status,
      );
      stop.status = status;
      stop.travelPoints = this.resolveTravelPoints(status, dto.travelPoints);

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

  private parseDateInput(input?: string | Date): Date | undefined {
    if (!input) {
      return undefined;
    }
    if (input instanceof Date) {
      return new Date(input);
    }
    if (typeof input === 'string' && input.includes('/')) {
      // dd/MM/yyyy
      const [d, m, y] = input.split('/');
      const parsed = new Date(Number(y), Number(m) - 1, Number(d));
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private parseTimeToMinutes(time: string): number {
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) {
      throw new BadRequestException('Thời gian phải ở định dạng HH:mm');
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
  }

  private validateStopTimeWindow(
    destination?: Destination,
    startTime?: string,
    endTime?: string,
  ): void {
    if (!startTime && !endTime) {
      return;
    }

    if (startTime && endTime) {
      const start = this.parseTimeToMinutes(startTime);
      const end = this.parseTimeToMinutes(endTime);
      if (start > end) {
        throw new BadRequestException('Giờ bắt đầu phải trước giờ kết thúc');
      }
    }

    if (destination?.openTime && destination?.closeTime) {
      const openMinutes = this.parseTimeToMinutes(destination.openTime);
      const closeMinutes = this.parseTimeToMinutes(destination.closeTime);

      if (startTime && this.parseTimeToMinutes(startTime) < openMinutes) {
        throw new BadRequestException(
          `Giờ bắt đầu phải sau giờ mở cửa (${destination.openTime})`,
        );
      }

      if (startTime && this.parseTimeToMinutes(startTime) > closeMinutes) {
        throw new BadRequestException(
          `Giờ bắt đầu phải trước giờ đóng cửa (${destination.closeTime})`,
        );
      }

      if (endTime && this.parseTimeToMinutes(endTime) > closeMinutes) {
        throw new BadRequestException(
          `Giờ kết thúc phải trước giờ đóng cửa (${destination.closeTime})`,
        );
      }

      if (endTime && this.parseTimeToMinutes(endTime) < openMinutes) {
        throw new BadRequestException(
          `Giờ kết thúc phải sau giờ mở cửa (${destination.openTime})`,
        );
      }
    }
  }

  private resolveRouteStatusFromStops(
    statuses: RouteStopStatus[],
  ): TravelRouteStatus {
    if (!statuses.length) {
      return TravelRouteStatus.DRAFT;
    }
    if (statuses.every((status) => status === RouteStopStatus.COMPLETED)) {
      return TravelRouteStatus.COMPLETED;
    }
    if (statuses.some((status) => status === RouteStopStatus.IN_PROGRESS)) {
      return TravelRouteStatus.IN_PROGRESS;
    }
    if (statuses.every((status) => status === RouteStopStatus.MISSED)) {
      return TravelRouteStatus.MISSED;
    }
    return TravelRouteStatus.UPCOMING;
  }

  private async updateRouteAggregates(
    routeId: number,
    manager: EntityManager,
  ): Promise<void> {
    const stopRepo = manager.getRepository(RouteStop);
    const aggregation = await stopRepo
      .createQueryBuilder('stop')
      .select('COALESCE(SUM(stop.travelPoints), 0)', 'total')
      .where('stop.route_id = :routeId', { routeId })
      .getRawOne<{ total: string }>();

    const totalPoints = Number(aggregation?.total ?? 0);
    const stopStatuses = await stopRepo.find({
      select: ['status'],
      where: { route: { id: routeId } },
    });
    const routeStatus = this.resolveRouteStatusFromStops(
      stopStatuses.map((stop) => stop.status),
    );

    await manager.getRepository(TravelRoute).update(routeId, {
      totalTravelPoints: totalPoints,
      status: routeStatus,
    });
  }
}
