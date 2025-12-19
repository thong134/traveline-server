
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

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const clone = new TravelRoute();
      clone.name = source.name;
      clone.province = source.province;

      clone.startDate = source.startDate ?? undefined;
      clone.endDate = source.endDate ?? undefined;
      clone.status = TravelRouteStatus.DRAFT;
      clone.user = user;
      clone.totalTravelPoints = 0;
      clone.averageRating = 0;
      clone.clonedFromRoute = source;

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
            stop.startTime ?? undefined,
            stop.endTime ?? undefined,
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

  async create(
    dto: CreateTravelRouteDto & { userId: number },
  ): Promise<TravelRoute> {
    const savedId = await this.dataSource.transaction(async (manager) => {
      const route = await this.prepareRouteEntity(
        dto,
        manager.getRepository(User),
      );
      route.status = TravelRouteStatus.DRAFT;
      const savedRoute = await manager.getRepository(TravelRoute).save(route);

      return savedRoute.id;
    });

    return this.findOne(savedId);
  }

  async findAll(options: TravelRouteQueryOptions = {}): Promise<TravelRoute[]> {
    const { q, userId, province } = options;
    const qb = this.routeRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.stops', 'stops')
      .leftJoinAndSelect('stops.destination', 'destination')
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

    qb.orderBy('route.createdAt', 'DESC')
      .addOrderBy('stops.dayOrder', 'ASC')
      .addOrderBy('stops.sequence', 'ASC');
    const routes = await qb.getMany();
    return Promise.all(routes.map((route) => this.findOne(route.id)));
  }

  async findByUser(userId: number): Promise<TravelRoute[]> {
    const routes = await this.routeRepo.find({
      where: { user: { id: userId } },
      select: { id: true },
      order: {
        createdAt: 'DESC',
      },
    });
    return Promise.all(routes.map((route) => this.findOne(route.id)));
  }

  async addStops(routeId: number, dtos: RouteStopDto[]): Promise<TravelRoute> {
    if (!dtos?.length) {
      throw new BadRequestException('Danh sách điểm dừng không được để trống');
    }

    await this.dataSource.transaction(async (manager) => {
      const routeRepo = manager.getRepository(TravelRoute);
      const stopRepo = manager.getRepository(RouteStop);
      const destinationRepo = manager.getRepository(Destination);

      const route = await routeRepo.findOne({
        where: { id: routeId },
        relations: { stops: true },
        order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
      });
      if (!route) {
        throw new NotFoundException(`Travel route ${routeId} not found`);
      }


      const newStops = await this.prepareStops(dtos, route, destinationRepo);
      await stopRepo.save(newStops);

      const allStops = [...(route.stops ?? []), ...newStops];
      this.ensureSequentialStopCoverage(route, allStops);

      await this.updateRouteAggregates(routeId, manager);
    });

    return this.findOne(routeId);
  }



  async findOne(id: number): Promise<TravelRoute> {
    await this.refreshRouteState(id);
    const route = await this.routeRepo.findOne({
      where: { id },
      relations: { stops: { destination: true }, user: true },
      order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
    });
    if (!route) {
      throw new NotFoundException(`Travel route ${id} not found`);
    }
    return route;
  }

  async getStopDetail(routeId: number, stopId: number): Promise<RouteStop> {
    await this.refreshRouteState(routeId);
    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async findRouteDatesByUser(userId: number): Promise<
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
    await Promise.all(routes.map((route) => this.refreshRouteState(route.id)));

    const refreshed = await this.routeRepo.find({
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

    return refreshed.map((route) => ({
      id: route.id,
      name: route.name,
      startDate: route.startDate ?? null,
      endDate: route.endDate ?? null,
      status: route.status,
    }));
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
            route,
            manager.getRepository(Destination),
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
      await this.updateRouteAggregates(routeId, manager);
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

      this.validateStopTimeWindow(
        destination,
        stop.startTime ?? undefined,
        stop.endTime ?? undefined,
      );

      await stopRepo.save(stop);
      await this.updateRouteAggregates(routeId, manager);
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



      await this.updateRouteAggregates(routeId, manager);
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
      stop.travelPoints = this.resolveTravelPoints(status);
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
      async (
        manager,
      ): Promise<{
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

        if (distance > toleranceMeters) {
          throw new BadRequestException(
            `Bạn đang cách điểm dừng khoảng ${distance} mét, vui lòng di chuyển tới đúng vị trí rồi thử lại`,
          );
        }

        stop.status = RouteStopStatus.COMPLETED;
        stop.travelPoints = this.resolveTravelPoints(RouteStopStatus.COMPLETED);
        await stopRepo.save(stop);
        await this.updateRouteAggregates(routeId, manager);

        return { matched: true, distanceMeters: distance, stop };
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
    dto: Partial<CreateTravelRouteDto> & {
      userId?: number;
      shared?: boolean;
      stops?: RouteStopDto[];
    },
    userRepository: Repository<User>,
  ): Promise<void> {
    const { userId, name, province, startDate, endDate } = dto;

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

    let durationDays: number | undefined;
    if (parsedStart && parsedEnd) {
      durationDays =
        Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 86_400_000) +
        1;
      if (maxDay && maxDay > 0 && durationDays < maxDay) {
        throw new BadRequestException(
          'Khoảng ngày (startDate - endDate) không đủ cho số dayOrder của các điểm dừng',
        );
      }
    }

    route.startDate = parsedStart;
    route.endDate = parsedEnd;


  }



  private calculateDurationDays(
    startDate?: Date,
    endDate?: Date,
  ): number | undefined {
    if (!startDate || !endDate) {
      return undefined;
    }
    const normalizedStart = this.normalizeDate(startDate);
    const normalizedEnd = this.normalizeDate(endDate);
    if (normalizedEnd < normalizedStart) {
      return undefined;
    }
    const diff =
      (normalizedEnd.getTime() - normalizedStart.getTime()) / 86_400_000 + 1;
    return Math.max(1, Math.floor(diff));
  }

  private async prepareStops(
    dtos: RouteStopDto[],
    route: TravelRoute,
    destinationRepository: Repository<Destination>,
  ): Promise<RouteStop[]> {
    const routeStartDate = route.startDate;
    const routeEndDate = route.endDate;

    if (!routeStartDate || !routeEndDate) {
      throw new BadRequestException(
        'Route phải có startDate và endDate trước khi thêm điểm dừng',
      );
    }

    const totalDays = this.calculateDurationDays(routeStartDate, routeEndDate);
    if (!totalDays) {
      throw new BadRequestException(
        'Khoảng thời gian của route không hợp lệ để thêm điểm dừng',
      );
    }

    const stops: RouteStop[] = [];
    const sortedDtos = [...dtos].sort((a, b) => {
      if (a.dayOrder === b.dayOrder) {
        return a.sequence - b.sequence;
      }
      return a.dayOrder - b.dayOrder;
    });

    const lastEndByDay = new Map<number, number>();
    const incompleteStopsByDay = new Map<number, RouteStopDto>();
    const now = new Date();

    for (const dto of sortedDtos) {
      if (dto.dayOrder > totalDays) {
        throw new BadRequestException(
          `dayOrder ${dto.dayOrder} vượt quá số ngày của route`,
        );
      }

      const stop = new RouteStop();
      stop.route = { id: route.id } as TravelRoute;
      stop.dayOrder = dto.dayOrder;
      stop.sequence = dto.sequence;
      stop.startTime = dto.startTime;
      stop.endTime = dto.endTime;
      stop.notes = dto.notes;
      stop.images = [];
      stop.videos = [];
      let destination: Destination | undefined;

      const previousIncomplete = incompleteStopsByDay.get(dto.dayOrder);
      if (previousIncomplete) {
        throw new BadRequestException(
          `Điểm dừng ngày ${dto.dayOrder} (thứ tự ${previousIncomplete.sequence}) phải có endTime trước khi thêm điểm tiếp theo`,
        );
      }

      if (!dto.startTime) {
        throw new BadRequestException(
          `Điểm dừng ngày ${dto.dayOrder} (thứ tự ${dto.sequence}) phải có startTime`,
        );
      }

      const previousEnd = lastEndByDay.get(dto.dayOrder);
      const currentStartMinutes = this.parseTimeToMinutes(dto.startTime);
      const currentEndMinutes = dto.endTime
        ? this.parseTimeToMinutes(dto.endTime)
        : undefined;

      if (currentStartMinutes > 1_439) {
        throw new BadRequestException(
          `startTime của điểm dừng ngày ${dto.dayOrder} (thứ tự ${dto.sequence}) không hợp lệ`,
        );
      }

      if (previousEnd !== undefined) {
        if (currentStartMinutes < previousEnd) {
          throw new BadRequestException(
            `startTime của điểm dừng ngày ${dto.dayOrder} (thứ tự ${dto.sequence}) phải sau hoặc bằng endTime của điểm trước đó`,
          );
        }
      }

      if (
        currentEndMinutes !== undefined &&
        currentStartMinutes >= currentEndMinutes
      ) {
        throw new BadRequestException(
          `startTime phải nhỏ hơn endTime cho điểm dừng ngày ${dto.dayOrder} (thứ tự ${dto.sequence})`,
        );
      }
      if (currentEndMinutes !== undefined && currentEndMinutes > 1_439) {
        throw new BadRequestException(
          `endTime của điểm dừng ngày ${dto.dayOrder} (thứ tự ${dto.sequence}) không hợp lệ`,
        );
      }

      const stopDate = this.normalizeDate(routeStartDate);
      stopDate.setDate(stopDate.getDate() + (dto.dayOrder - 1));

      if (stopDate > this.normalizeDate(routeEndDate)) {
        throw new BadRequestException(
          `dayOrder ${dto.dayOrder} vượt quá khoảng thời gian của route`,
        );
      }

      const startDateTime = this.buildDateWithTime(stopDate, dto.startTime, 0, 0);
      if (startDateTime <= now) {
        throw new BadRequestException(
          `Thời gian bắt đầu của điểm dừng ngày ${dto.dayOrder} (thứ tự ${dto.sequence}) phải nằm trong tương lai`,
        );
      }

      if (dto.endTime) {
        const endDateTime = this.buildDateWithTime(stopDate, dto.endTime, 23, 59);
        const routeEndCutoff = this.buildDateWithTime(
          this.normalizeDate(routeEndDate),
          '23:59',
          23,
          59,
        );
        if (endDateTime > routeEndCutoff) {
          throw new BadRequestException(
            `Thời gian của điểm dừng ngày ${dto.dayOrder} vượt quá endDate của route`,
          );
        }
      }

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
        dto.startTime,
        dto.endTime,
      );
      stop.status = status;
      stop.travelPoints = 0;

      stops.push(stop);

      if (currentEndMinutes !== undefined) {
        lastEndByDay.set(dto.dayOrder, currentEndMinutes);
        incompleteStopsByDay.delete(dto.dayOrder);
      } else {
        incompleteStopsByDay.set(dto.dayOrder, dto);
        lastEndByDay.delete(dto.dayOrder);
      }
    }

    return stops;
  }

  private determineStopStatus(
    routeStartDate: Date | undefined,
    dayOrder: number,
    startTime?: string,
    endTime?: string,
  ): RouteStopStatus {
    if (!routeStartDate) {
      return RouteStopStatus.UPCOMING;
    }

    const now = new Date();
    const stopBaseDate = this.computeStopBaseDate(routeStartDate, dayOrder);
    const startDateTime = this.buildDateWithTime(stopBaseDate, startTime, 0, 0);
    const endDateTime = this.buildDateWithTime(stopBaseDate, endTime, 23, 59);

    if (now < startDateTime) {
      return RouteStopStatus.UPCOMING;
    }
    if (now <= endDateTime) {
      return RouteStopStatus.IN_PROGRESS;
    }
    return RouteStopStatus.MISSED;
  }

  private resolveTravelPoints(status: RouteStopStatus): number {
    return status === RouteStopStatus.COMPLETED ? 5000 : 0;
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

  private buildDateWithTime(
    baseDate: Date,
    time: string | undefined,
    fallbackHour: number,
    fallbackMinute: number,
  ): Date {
    const result = new Date(baseDate);
    if (!time) {
      result.setHours(fallbackHour, fallbackMinute, 0, 0);
      return result;
    }
    const totalMinutes = this.parseTimeToMinutes(time);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private computeStopBaseDate(
    routeStartDate: Date,
    dayOrder: number,
  ): Date {
    const base = new Date(routeStartDate);
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + Math.max(0, dayOrder - 1));
    return base;
  }

  private normalizeDate(input: Date): Date {
    const normalized = new Date(input);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private resolveStopStatusBySchedule(
    route: TravelRoute,
    stop: RouteStop,
    reference: Date,
  ): RouteStopStatus {
    if (!route.startDate) {
      return stop.status ?? RouteStopStatus.UPCOMING;
    }

    const stopBaseDate = this.computeStopBaseDate(route.startDate, stop.dayOrder);
    const startDateTime = this.buildDateWithTime(stopBaseDate, stop.startTime, 0, 0);
    const endDateTime = this.buildDateWithTime(stopBaseDate, stop.endTime, 23, 59);

    if (reference < startDateTime) {
      return RouteStopStatus.UPCOMING;
    }
    if (reference <= endDateTime) {
      return RouteStopStatus.IN_PROGRESS;
    }
    return RouteStopStatus.MISSED;
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
      if (start >= end) {
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

  private async updateRouteAggregates(
    routeId: number,
    manager: EntityManager,
  ): Promise<void> {
    const routeRepo = manager.getRepository(TravelRoute);
    const stopRepo = manager.getRepository(RouteStop);

    const route = await routeRepo.findOne({
      where: { id: routeId },
      relations: { stops: true, clonedFromRoute: true },
      order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
    });
    if (!route) {
      return;
    }

    const now = new Date();
    const stops = route.stops ?? [];
    const stopUpdates: RouteStop[] = [];

    for (const stop of stops) {
      const previousStatus = stop.status;
      const previousPoints = stop.travelPoints ?? 0;

      let nextStatus = previousStatus;
      // Only update status if it's not already completed (completed is final via check-in)
      // But wait, if it was completed, can it become missed? No, check-in is final.
      if (previousStatus !== RouteStopStatus.COMPLETED) {
        nextStatus = this.resolveStopStatusBySchedule(route, stop, now);
      }

      const nextPoints = this.resolveTravelPoints(nextStatus);

      if (nextStatus !== previousStatus || nextPoints !== previousPoints) {
        stop.status = nextStatus;
        stop.travelPoints = nextPoints;
        stopUpdates.push(stop);
      }
    }

    if (stopUpdates.length) {
      await stopRepo.save(stopUpdates);
    }

    this.ensureSequentialStopCoverage(route, stops);

    const totalCompleted = stops.filter(
      (stop) => stop.status === RouteStopStatus.COMPLETED,
    ).length;
    const hasStops = stops.length > 0;
    const hasMissed = stops.some((stop) => stop.status === RouteStopStatus.MISSED);
    const allCompleted = hasStops && totalCompleted === stops.length;

    let nextRouteStatus = route.status;

    // Priority:
    // 1. Draft (if new/cloned and no dates - handled by creation logic mostly, but here we check dates)
    // 2. Missed (if any stop missed)
    // 3. Completed (if all stops completed)
    // 4. Upcoming/InProgress (based on date)

    if (route.clonedFromRoute && !route.startDate) {
       // Keep as draft if cloned and not set up
       nextRouteStatus = TravelRouteStatus.DRAFT;
    } else if (hasMissed) {
      nextRouteStatus = TravelRouteStatus.MISSED;
    } else if (allCompleted) {
      nextRouteStatus = TravelRouteStatus.COMPLETED;
    } else if (route.startDate) {
      const routeStart = this.normalizeDate(route.startDate);
      const today = this.normalizeDate(now);
      if (today < routeStart) {
        nextRouteStatus = TravelRouteStatus.UPCOMING;
      } else {
        // today >= routeStart
        nextRouteStatus = TravelRouteStatus.IN_PROGRESS;
      }
    } else if (nextRouteStatus !== TravelRouteStatus.DRAFT) {
      // Fallback if no start date but not draft? Should be draft.
      nextRouteStatus = TravelRouteStatus.DRAFT;
    }

    const totalPoints = totalCompleted * 5000;
    const updates: Partial<TravelRoute> = {};

    if (route.totalTravelPoints !== totalPoints) {
      updates.totalTravelPoints = totalPoints;
    }

    if (route.status !== nextRouteStatus) {
      updates.status = nextRouteStatus;
    }

    if (Object.keys(updates).length) {
      await routeRepo.update(routeId, updates);
    }
  }

  private async refreshRouteState(routeId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.updateRouteAggregates(routeId, manager);
    });
  }

  private ensureSequentialStopCoverage(route: TravelRoute, stops: RouteStop[]): void {
    if (!route.startDate || !route.endDate || !stops.length) {
      return;
    }

    const normalizedStart = this.normalizeDate(route.startDate);
    const normalizedEnd = this.normalizeDate(route.endDate);
    const totalDays = this.calculateDurationDays(normalizedStart, normalizedEnd);

    if (!totalDays) {
      return;
    }

    const stopsByDay = new Map<number, RouteStop[]>();
    for (const stop of stops) {
      const list = stopsByDay.get(stop.dayOrder) ?? [];
      list.push(stop);
      stopsByDay.set(stop.dayOrder, list);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dayStops = stopsByDay.get(day);
      if (!dayStops || !dayStops.length) {
        throw new BadRequestException(
          `Thiếu điểm dừng cho dayOrder ${day}. Vui lòng tạo đầy đủ trước khi tiếp tục`,
        );
      }

      dayStops.sort((a, b) => a.sequence - b.sequence);
      for (let idx = 0; idx < dayStops.length - 1; idx += 1) {
        const current = dayStops[idx];
        const next = dayStops[idx + 1];

        if (!current.endTime) {
          throw new BadRequestException(
            `Điểm dừng ngày ${current.dayOrder} (thứ tự ${current.sequence}) cần endTime để tạo khoảng trống cho điểm tiếp theo`,
          );
        }
        if (!next.startTime) {
          throw new BadRequestException(
            `Điểm dừng ngày ${next.dayOrder} (thứ tự ${next.sequence}) cần startTime để xác định thứ tự thời gian`,
          );
        }

        const currentEnd = this.parseTimeToMinutes(current.endTime);
        const nextStart = this.parseTimeToMinutes(next.startTime);
        if (currentEnd > nextStart) {
          throw new BadRequestException(
            `endTime của điểm dừng ngày ${current.dayOrder} (thứ tự ${current.sequence}) phải nhỏ hơn hoặc bằng startTime của điểm dừng thứ tự ${next.sequence}`,
          );
        }
      }
    }
  }
}
