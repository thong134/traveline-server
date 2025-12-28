
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
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
import { firstValueFrom } from 'rxjs';
import { AdvancedSuggestTravelRouteDto } from './dto/advanced-suggest-travel-route.dto';
import { QuickSuggestTravelRouteDto } from './dto/quick-suggest-travel-route.dto';

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
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
  ) {}

  async cloneRoute(routeId: number, name?: string): Promise<TravelRoute> {
    const savedId = await this.dataSource.transaction(async (manager) => {
      const routeRepo = manager.getRepository(TravelRoute);
      const stopRepo = manager.getRepository(RouteStop);

      const source = await routeRepo.findOne({
        where: { id: routeId },
        relations: { stops: { destination: true }, user: true },
        order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
      });

      if (!source) {
        throw new NotFoundException(`Travel route ${routeId} not found`);
      }

      const clone = new TravelRoute();
      clone.name = name ?? source.name;
      clone.province = source.province;
      clone.startDate = source.startDate ?? undefined;
      clone.endDate = source.endDate ?? undefined;
      clone.status = null as any; // Public clones have null status
      clone.user = source.user; // Still owned by the same user
      clone.isPublic = true;     // This is the public version
      clone.isEdited = false;    // Clones are not considered "edited" initially
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
          newStop.notes = undefined; // Clear personal notes
          newStop.images = [];       // Clear personal media
          newStop.videos = [];       // Clear personal media
          newStop.status = null as any; // Public clones have null status for stops
          newStop.travelPoints = 0;
          if (stop.destination) {
            newStop.destination = stop.destination;
          }
          return newStop;
        });

        await stopRepo.save(stops);
      }

      await this.updateRouteAggregates(savedRoute.id, manager);
      return savedRoute.id;
    });

    return this.findOne(savedId);
  }

  async publicizeRoute(routeId: number, userId: number): Promise<TravelRoute> {
    const route = await this.routeRepo.findOne({
      where: { id: routeId },
      relations: { user: true },
    });

    if (!route) {
      throw new NotFoundException(`Route ${routeId} not found`);
    }

    if (route.user?.id !== userId) {
      throw new ForbiddenException('You do not own this route');
    }

    if (route.status !== TravelRouteStatus.COMPLETED) {
      throw new BadRequestException('Only completed routes can be publicized');
    }

    if (!route.isEdited) {
      throw new BadRequestException('Only edited routes can be publicized');
    }

    return this.cloneRoute(routeId);
  }

  async create(
    dto: CreateTravelRouteDto & { userId: number },
  ): Promise<TravelRoute> {
    const savedId = await this.dataSource.transaction(async (manager) => {
      const route = await this.prepareRouteEntity(
        dto,
        manager.getRepository(User),
      );
      route.status = TravelRouteStatus.UPCOMING;
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
      where: { user: { id: userId }, isPublic: false },
      select: { id: true },
      order: {
        createdAt: 'DESC',
      },
    });
    return Promise.all(routes.map((route) => this.findOne(route.id)));
  }

  async findDrafts(province?: string): Promise<TravelRoute[]> {
    const qb = this.routeRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.stops', 'stops')
      .leftJoinAndSelect('stops.destination', 'destination')
      .where('route.isPublic = :isPublic', { isPublic: true });

    if (province) {
      qb.andWhere('route.province = :province', { province });
    }

    qb.orderBy('route.createdAt', 'DESC')
      .addOrderBy('stops.dayOrder', 'ASC')
      .addOrderBy('stops.sequence', 'ASC');

    const routes = await qb.getMany();
    return Promise.all(routes.map((route) => this.findOne(route.id)));
  }

  async useClone(routeId: number, userId: number, payload: { startDate: Date; endDate: Date; name?: string }): Promise<TravelRoute> {
    const savedId = await this.dataSource.transaction(async (manager) => {
      const routeRepo = manager.getRepository(TravelRoute);
      const stopRepo = manager.getRepository(RouteStop);
      const userRepo = manager.getRepository(User);

      const publicRoute = await routeRepo.findOne({
        where: { id: routeId, isPublic: true },
        relations: { stops: { destination: true } },
        order: { stops: { dayOrder: 'ASC', sequence: 'ASC' } },
      });

      if (!publicRoute) {
        throw new NotFoundException(`Public route ${routeId} not found`);
      }

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      // Check if user already has a personal copy of this public route
      const existingClone = await routeRepo.findOne({
        where: {
          user: { id: userId },
          clonedFromRoute: { id: routeId },
          isPublic: false,
        },
      });

      if (existingClone) {
        return existingClone.id; // Return existing ID instead of creating new one
      }

      // Create a fresh personal copy
      const myRoute = new TravelRoute();
      myRoute.name = payload.name ?? publicRoute.name;
      myRoute.province = publicRoute.province;
      myRoute.startDate = payload.startDate;
      myRoute.endDate = payload.endDate;
      myRoute.status = TravelRouteStatus.UPCOMING;
      myRoute.user = user;
      myRoute.isPublic = false;
      myRoute.isEdited = false;
      myRoute.totalTravelPoints = 0;
      myRoute.averageRating = 0;
      myRoute.clonedFromRoute = publicRoute;

      const savedRoute = await routeRepo.save(myRoute);

      if (publicRoute.stops?.length) {
        const stops = publicRoute.stops.map((stop) => {
          const newStop = new RouteStop();
          newStop.route = savedRoute;
          newStop.dayOrder = stop.dayOrder;
          newStop.sequence = stop.sequence;
          newStop.startTime = stop.startTime;
          newStop.endTime = stop.endTime;
          newStop.notes = undefined;
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
      return savedRoute.id;
    });

    return this.findOne(savedId);
  }

  async findFavoritesByUser(userId: number): Promise<TravelRoute[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favoriteTravelRouteIds?.length) {
      return [];
    }

    const ids = user.favoriteTravelRouteIds
      .map((rawId) => Number(rawId))
      .filter((value) => !Number.isNaN(value) && Number.isInteger(value));

    if (!ids.length) {
      return [];
    }

    const routes = await this.routeRepo.find({
      where: { id: In(ids) },
      select: { id: true },
    });

    const refreshed = await Promise.all(routes.map((r) => this.findOne(r.id)));
    const order = new Map(ids.map((value, index) => [value, index]));

    return refreshed.sort((a, b) => {
      const left = order.get(a.id) ?? 0;
      const right = order.get(b.id) ?? 0;
      return left - right;
    });
  }

  async favorite(routeId: number, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const route = await this.routeRepo.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException(`Travel route ${routeId} not found`);
    }

    if (!route.isPublic) {
      throw new BadRequestException('Chỉ có thể thêm hành trình công khai vào danh sách yêu thích');
    }

    const current = user.favoriteTravelRouteIds ?? [];
    if (!current.includes(routeId.toString())) {
      user.favoriteTravelRouteIds = [...current, routeId.toString()];
      await this.userRepo.save(user);

      await this.routeRepo.increment({ id: routeId }, 'favouriteTimes', 1);
    }
  }

  async unfavorite(routeId: number, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const current = user.favoriteTravelRouteIds ?? [];
    if (current.includes(routeId.toString())) {
      user.favoriteTravelRouteIds = current.filter((id) => id !== routeId.toString());
      await this.userRepo.save(user);

      await this.routeRepo.decrement({ id: routeId }, 'favouriteTimes', 1);
    }
  }

  async addStops(routeId: number, dtos: RouteStopDto[]): Promise<TravelRoute> {
    if (!dtos?.length) {
      throw new BadRequestException('Stop list cannot be empty');
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

      route.isEdited = true;
      const newStops = await this.prepareStops(dtos, route, destinationRepo);
      const allStops = [...(route.stops ?? []), ...newStops];
      
      this.resequenceStops(allStops);
      await stopRepo.save(allStops);

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
      where: { user: { id: userId }, isPublic: false },
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
      where: { user: { id: userId }, isPublic: false },
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



  async update(id: number, userId: number, dto: UpdateTravelRouteDto): Promise<TravelRoute> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TravelRoute);
      const route = await repo.findOne({ where: { id }, relations: { user: true } });
      if (!route) {
        throw new NotFoundException(`Travel route ${id} not found`);
      }

      if (route.user?.id !== userId) {
        throw new ForbiddenException('You do not own this route');
      }

      if (dto.startDate || dto.endDate) {
        if (route.status !== TravelRouteStatus.UPCOMING) {
          throw new BadRequestException('Cannot change start/end date for a route that is not UPCOMING');
        }
      }

      await this.assignRouteFields(route, dto, manager.getRepository(User));
      route.isEdited = true;
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

      if (
        stop.status === RouteStopStatus.IN_PROGRESS ||
        stop.status === RouteStopStatus.COMPLETED ||
        stop.status === RouteStopStatus.MISSED
      ) {
        throw new BadRequestException(
          `Cannot update time for a stop that is ${stop.status}`,
        );
      }

      const nextStart = payload.startTime ?? stop.startTime;
      const nextEnd = payload.endTime ?? stop.endTime;

      this.validateStopTimeWindow(stop.destination, nextStart, nextEnd);

      stop.startTime = nextStart;
      stop.endTime = nextEnd;

      const route = await manager.getRepository(TravelRoute).findOne({ where: { id: routeId } });
      if (route) {
        route.isEdited = true;
        await manager.getRepository(TravelRoute).save(route);
      }

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

      if (stop.status === RouteStopStatus.COMPLETED) {
        throw new BadRequestException('Cannot update details for a completed stop');
      }

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
        stop.destination = foundDestination;
      }

      if (payload.notes !== undefined) {
        stop.notes = payload.notes;
      }

      const routeObj = await manager.getRepository(TravelRoute).findOne({ where: { id: routeId } });
      if (routeObj) {
        routeObj.isEdited = true;
        await manager.getRepository(TravelRoute).save(routeObj);
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

      const route = await routeRepo.findOne({ where: { id: routeId } });
      if (!route) {
        throw new NotFoundException(`Travel route ${routeId} not found`);
      }

      if (
        route.status === TravelRouteStatus.IN_PROGRESS ||
        route.status === TravelRouteStatus.COMPLETED ||
        route.status === TravelRouteStatus.MISSED
      ) {
        throw new BadRequestException(
          `Cannot reorder stops for a route that is ${route.status}`,
        );
      }
      
      const targetStop = await stopRepo.findOne({
        where: { id: stopId, route: { id: routeId } },
      });

      if (!targetStop) {
        throw new NotFoundException(
          `Route stop ${stopId} not found in route ${routeId}`,
        );
      }

      const currentDay = targetStop.dayOrder;
      const stopsInDay = await stopRepo.find({
        where: { route: { id: routeId }, dayOrder: currentDay },
        order: { sequence: 'ASC' },
      });

      // 1. Capture time slots (startTime, endTime) from the current order
      const timeSlots = stopsInDay.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      }));

      // 2. Reorder the stops (destinations) based on the new sequence
      const currentIndex = stopsInDay.findIndex((s) => s.id === stopId);
      if (currentIndex === -1) {
         // Should not happen as we fetched by ID earlier, but safe check
         throw new NotFoundException(`Stop ${stopId} not found in day list`);
      }

      const [movedStop] = stopsInDay.splice(currentIndex, 1);
      const newSequence = Math.max(1, Math.min(payload.sequence, stopsInDay.length + 1));
      stopsInDay.splice(newSequence - 1, 0, movedStop);

      // 3. Re-assign the captured time slots to the stops in the new order
      // and update their sequence numbers
      const updates: RouteStop[] = [];
      stopsInDay.forEach((stop, index) => {
        stop.sequence = index + 1;
        // Assign time slot from the *position* (index)
        if (timeSlots[index]) {
            stop.startTime = timeSlots[index].startTime;
            stop.endTime = timeSlots[index].endTime;
        }
        updates.push(stop);
      });

      const routeObj = await manager.getRepository(TravelRoute).findOne({ where: { id: routeId } });
      if (routeObj) {
        routeObj.isEdited = true;
        await manager.getRepository(TravelRoute).save(routeObj);
      }

      await stopRepo.save(updates);
      await this.updateRouteAggregates(routeId, manager);
    });

    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async removeStop(routeId: number, stopId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const stopRepo = manager.getRepository(RouteStop);
      const stop = await stopRepo.findOne({
        where: { id: stopId, route: { id: routeId } },
      });

      if (!stop) {
        throw new NotFoundException(
          `Route stop ${stopId} not found in route ${routeId}`,
        );
      }

      const dayOrder = stop.dayOrder;
      await stopRepo.remove(stop);

      // Re-sequence remaining stops in the same day
      const stopsInDay = await stopRepo.find({
        where: { route: { id: routeId }, dayOrder },
        order: { sequence: 'ASC' },
      });

      for (let i = 0; i < stopsInDay.length; i++) {
        stopsInDay[i].sequence = i + 1;
      }
      await stopRepo.save(stopsInDay);

      const routeObj = await manager.getRepository(TravelRoute).findOne({ where: { id: routeId } });
      if (routeObj) {
        routeObj.isEdited = true;
        await manager.getRepository(TravelRoute).save(routeObj);
      }

      await this.updateRouteAggregates(routeId, manager);
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

      const routeObj = await manager.getRepository(TravelRoute).findOne({ where: { id: routeId } });
      if (routeObj) {
        routeObj.isEdited = true;
        await manager.getRepository(TravelRoute).save(routeObj);
      }
    });

    return this.getStopOrFail(routeId, stopId, undefined, {
      withDestination: true,
    });
  }

  async deleteStopMedia(
    routeId: number,
    stopId: number,
    mediaUrls: { images?: string[]; videos?: string[] },
  ): Promise<RouteStop> {
    await this.dataSource.transaction(async (manager) => {
      const stopRepo = manager.getRepository(RouteStop);
      const stop = await this.getStopOrFail(routeId, stopId, manager);

      const imagesToDelete = mediaUrls.images ?? [];
      const videosToDelete = mediaUrls.videos ?? [];

      if (!imagesToDelete.length && !videosToDelete.length) {
        return;
      }

      // Xóa ảnh khỏi Cloudinary và cập nhật mảng images
      for (const url of imagesToDelete) {
        if (!stop.images?.includes(url)) {
          continue;
        }
        const publicId = this.cloudinaryService.extractPublicIdFromUrl(url);
        await this.cloudinaryService.deleteImage(publicId);
        stop.images = stop.images.filter((img) => img !== url);
      }

      // Xóa video khỏi Cloudinary và cập nhật mảng videos
      for (const url of videosToDelete) {
        if (!stop.videos?.includes(url)) {
          continue;
        }
        const publicId = this.cloudinaryService.extractPublicIdFromUrl(url);
        await this.cloudinaryService.deleteVideo(publicId);
        stop.videos = stop.videos.filter((vid) => vid !== url);
      }

      await stopRepo.save(stop);

      const routeObj = await manager.getRepository(TravelRoute).findOne({ where: { id: routeId } });
      if (routeObj) {
        routeObj.isEdited = true;
        await manager.getRepository(TravelRoute).save(routeObj);
      }
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
          throw new BadRequestException('Stop is not linked to a destination');
        }

        if (stop.destination.longitude == null) {
          throw new BadRequestException('Destination is missing longitude');
        }

        const distance = this.calculateDistanceMeters(
          latitude,
          longitude,
          stop.destination.latitude,
          stop.destination.longitude,
        );

        if (distance > toleranceMeters) {
          throw new BadRequestException(
            `You are ${distance} meters away from the stop, please move to the correct location and try again`,
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
      throw new BadRequestException('startDate must be less than or equal to endDate');
    }

    if (parsedStart) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedStart < today) {
        throw new BadRequestException(
          'startDate cannot be in the past.',
        );
      }
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
          'Date range (startDate - endDate) is not sufficient for the dayOrder of stops',
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
        'Route must have startDate and endDate before adding stops',
      );
    }

    const totalDays = this.calculateDurationDays(routeStartDate, routeEndDate);
    if (!totalDays) {
      throw new BadRequestException(
        'Route duration is invalid for adding stops',
      );
    }

    const stops: RouteStop[] = [];
    const sortedDtos = [...dtos].sort((a, b) => {
      if (a.dayOrder === b.dayOrder) {
        const timeA = a.startTime ? this.parseTimeToMinutes(a.startTime) : 0;
        const timeB = b.startTime ? this.parseTimeToMinutes(b.startTime) : 0;
        if (timeA !== timeB) return timeA - timeB;
        return a.sequence - b.sequence;
      }
      return a.dayOrder - b.dayOrder;
    });

    const incompleteStopsByDay = new Map<number, RouteStopDto>();
    const dayIntervals = new Map<number, Array<{ start: number; end: number; sequence: number }>>();
    const now = new Date();

    for (const dto of sortedDtos) {
      if (dto.dayOrder > totalDays) {
        throw new BadRequestException(
          `dayOrder ${dto.dayOrder} exceeds route duration`,
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
          `Stop on day ${dto.dayOrder} (sequence ${previousIncomplete.sequence}) must have endTime before adding the next stop`,
        );
      }

      if (!dto.startTime) {
        throw new BadRequestException(
          `Stop on day ${dto.dayOrder} (sequence ${dto.sequence}) must have startTime`,
        );
      }

      const currentStartMinutes = this.parseTimeToMinutes(dto.startTime);
      const currentEndMinutes = dto.endTime
        ? this.parseTimeToMinutes(dto.endTime)
        : undefined;

      if (currentStartMinutes > 1_439) {
        throw new BadRequestException(
          `Invalid startTime for stop on day ${dto.dayOrder} (sequence ${dto.sequence})`,
        );
      }

      if (
        currentEndMinutes !== undefined &&
        currentStartMinutes >= currentEndMinutes
      ) {
        throw new BadRequestException(
          `startTime must be less than endTime for stop on day ${dto.dayOrder} (sequence ${dto.sequence})`,
        );
      }
      if (currentEndMinutes !== undefined && currentEndMinutes > 1_439) {
        throw new BadRequestException(
          `Invalid endTime for stop on day ${dto.dayOrder} (sequence ${dto.sequence})`,
        );
      }

      const stopDate = this.normalizeDate(routeStartDate);
      stopDate.setDate(stopDate.getDate() + (dto.dayOrder - 1));

      if (stopDate > this.normalizeDate(routeEndDate)) {
        throw new BadRequestException(
          `dayOrder ${dto.dayOrder} exceeds route duration`,
        );
      }

      const startDateTime = this.buildDateWithTime(stopDate, dto.startTime, 0, 0);
      if (startDateTime <= now) {
        throw new BadRequestException(
          `Start time of stop on day ${dto.dayOrder} (sequence ${dto.sequence}) must be in the future`,
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
            `Stop time on day ${dto.dayOrder} exceeds route endDate`,
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

      const startMinutes = currentStartMinutes;
      const endMinutes = currentEndMinutes ?? currentStartMinutes;
      const intervals = dayIntervals.get(dto.dayOrder) ?? [];
      for (const interval of intervals) {
        const overlap = startMinutes < interval.end && endMinutes > interval.start;
        if (overlap) {
          throw new BadRequestException(
            `Thời gian điểm dừng (sequence ${dto.sequence}) trùng với điểm sequence ${interval.sequence} trên cùng ngày`,
          );
        }
      }
      intervals.push({ start: startMinutes, end: endMinutes, sequence: dto.sequence });
      dayIntervals.set(dto.dayOrder, intervals);

      const status = this.determineStopStatus(
        routeStartDate,
        dto.dayOrder,
        dto.startTime,
        dto.endTime,
      );
      stop.status = status;
      stop.travelPoints = 0;

      stops.push(stop);
      if (currentEndMinutes === undefined) {
        incompleteStopsByDay.set(dto.dayOrder, dto);
      } else {
        incompleteStopsByDay.delete(dto.dayOrder);
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
      throw new BadRequestException('Time must be in HH:mm format');
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
  }

  async suggestQuick(userId: number, dto: QuickSuggestTravelRouteDto): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const uniqueHobbies = this.mapHobbiesToCategories(user.hobbies || []);

    try {
      const resp = await firstValueFrom(
        this.httpService.post('/recommend/route', {
          hobbies: uniqueHobbies,
          favorites: user.favoriteDestinationIds || [],
          province: dto.province,
          startDate: dto.startDate,
          endDate: dto.endDate,
        }),
      );
      const data = resp.data;
      if (data.stops?.length) {
        const destIds = data.stops.map((s: any) => s.destinationId).filter((id: any) => typeof id === 'number');
        const dests = await this.destinationRepo.find({
          where: { id: In(destIds) },
        });
        const destMap = new Map(dests.map(d => [d.id, d]));
        data.stops = data.stops.map((s: any) => ({
          ...s,
          destination: destMap.get(s.destinationId),
        }));
      }
      return data;
    } catch (error) {
      this.handleAiServiceError(error);
    }
  }

  async suggestAdvanced(userId: number, dto: AdvancedSuggestTravelRouteDto): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const uniqueHobbies = this.mapHobbiesToCategories(user.hobbies || []);

    // If dates provided, use new AI route endpoint
    if (dto.startDate && dto.endDate && dto.province) {
      try {
        const startCoords = dto.startCoordinates;
        const resp = await firstValueFrom(
          this.httpService.post('/recommend/route', {
            hobbies: uniqueHobbies,
            favorites: user.favoriteDestinationIds || [],
            province: dto.province,
            startDate: dto.startDate,
            endDate: dto.endDate,
            start_lat: startCoords?.latitude,
            start_long: startCoords?.longitude,
          }),
        );
        const data = resp.data;
        if (data.stops?.length) {
          const destIds = data.stops.map((s: any) => s.destinationId).filter((id: any) => typeof id === 'number');
          const dests = await this.destinationRepo.find({
            where: { id: In(destIds) },
          });
          const destMap = new Map(dests.map(d => [d.id, d]));
          data.stops = data.stops.map((s: any) => ({
            ...s,
            destination: destMap.get(s.destinationId),
          }));
        }
        return data;
      } catch (error) {
        this.handleAiServiceError(error);
      }
    }

    // Legacy Fallback
    try {
      const startPayload = await this.buildStartPayload(dto);
      const resp = await firstValueFrom(
        this.httpService.post('/route', {
          maxTime: dto.maxTime,
          topN: dto.topN,
          includeRated: dto.includeRated,
          randomSeed: dto.randomSeed,
        }),
      );
      return resp.data;
    } catch (error) {
      this.handleAiServiceError(error);
    }
  }

  async claimSuggestedRoute(userId: number, data: any): Promise<TravelRoute> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    return this.dataSource.transaction(async (manager) => {
      const routeRepo = manager.getRepository(TravelRoute);
      const stopRepo = manager.getRepository(RouteStop);

      const route = new TravelRoute();
      route.user = user;
      route.name = data.name || `Lộ trình ${data.province || ''}`;
      route.province = data.province;
      route.startDate = this.parseDateInput(data.startDate);
      route.endDate = this.parseDateInput(data.endDate);
      route.status = TravelRouteStatus.DRAFT;
      route.isPublic = false;
      route.isEdited = true;

      const savedRoute = await routeRepo.save(route);

      if (data.stops?.length) {
        const stops = await Promise.all(
          data.stops.map(async (s: any) => {
            const stop = new RouteStop();
            stop.route = savedRoute;
            stop.dayOrder = s.dayOrder;
            stop.sequence = s.sequence;
            stop.startTime = s.startTime;
            stop.endTime = s.endTime;
            stop.notes = s.notes;
            stop.status = RouteStopStatus.UPCOMING;

            if (s.destinationId) {
              const dest = await manager.findOne(Destination, { where: { id: s.destinationId } });
              if (dest) {
                stop.destination = dest;
              }
            }
            return stop;
          }),
        );
        await stopRepo.save(stops);
      }

      return this.findOne(savedRoute.id);
    });
  }

  private mapHobbiesToCategories(userHobbies: string[]): string[] {
    const hobbyToCategoryMap: Record<string, string[]> = {
      'Adventure': ['Thiên nhiên'],
      'Relaxation': ['Thiên nhiên', 'Giải trí'],
      'Culture&History': ['Công trình', 'Văn hóa', 'Lịch sử'],
      'Entertainment': ['Giải trí'],
      'Nature': ['Thiên nhiên'],
      'Beach&Islands': ['Biển'],
      'Mountain&Forest': ['Núi'],
      'Photography': ['Thiên nhiên', 'Công trình'],
      'Foods&Drinks': ['Công trình', 'Văn hóa'],
    };

    const aiHobbies: string[] = [];
    for (const hobby of userHobbies) {
      const mapped = hobbyToCategoryMap[hobby] || [];
      aiHobbies.push(...mapped);
    }
    return [...new Set(aiHobbies)];
  }

  private handleAiServiceError(error: any) {
    const axiosError = error as AxiosError<{ detail?: string; error?: string }>;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const detail = axiosError.response.data?.detail ?? axiosError.response.data?.error ?? axiosError.message;
      if (status >= 400 && status < 500) {
        throw new BadRequestException(detail);
      }
      throw new ServiceUnavailableException(detail);
    }
    throw new ServiceUnavailableException('Không thể kết nối tới AI route service');
  }

  async getAnniversaryDetail(routeId: number, userId: number): Promise<any> {
    const route = await this.routeRepo.findOne({
      where: { id: routeId },
      relations: { stops: true, user: true },
    });

    if (!route) throw new NotFoundException('Route not found');
    if (route.user?.id !== userId) throw new ForbiddenException('Not your route');
    if (route.status !== TravelRouteStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể xem kỷ niệm cho chuyến đi đã hoàn thành');
    }

    const today = new Date();
    const endDate = route.endDate || new Date();

    const diffYears = differenceInYears(today, endDate);
    const diffMonths = differenceInMonths(today, endDate);
    const diffDays = differenceInDays(today, endDate);
    const diffWeeks = Math.floor(diffDays / 7);

    let period = '';
    if (diffYears >= 1) {
      period = `${diffYears} năm`;
    } else if (diffMonths >= 1) {
      period = `${diffMonths} tháng`;
    } else if (diffWeeks >= 1) {
      period = `${diffWeeks} tuần`;
    } else {
      period = `${diffDays} ngày`;
    }

    const message = `Đã ${period} kể từ khi bạn hoàn thành chuyến đi "${route.name}". Hãy cùng xem lại những khoảnh khắc tuyệt vời nhé!`;

    const media: any[] = [];
    route.stops?.forEach((stop) => {
      stop.images?.forEach((url) =>
        media.push({ url, type: 'image', stopId: stop.id }),
      );
      stop.videos?.forEach((url) =>
        media.push({ url, type: 'video', stopId: stop.id }),
      );
    });

    return {
      routeId: route.id,
      name: route.name,
      period,
      message,
      media,
    };
  }

  private async buildStartPayload(dto: AdvancedSuggestTravelRouteDto): Promise<{
    startDestinationId?: string;
    startCoordinates?: { latitude: number; longitude: number };
    startLabel?: string;
  }> {
    if (dto.startDestinationId) {
      await this.ensureDestinationsExist([dto.startDestinationId]);
      return { startDestinationId: String(dto.startDestinationId), startLabel: dto.startLabel };
    }

    if (dto.startCoordinates) {
      return {
        startCoordinates: {
          latitude: dto.startCoordinates.latitude,
          longitude: dto.startCoordinates.longitude,
        },
        startLabel: dto.startLabel,
      };
    }

    const fallback = await this.findFallbackStart(dto.province);
    if (fallback) {
      return {
        startDestinationId: String(fallback.id),
        startLabel: dto.startLabel ?? fallback.name,
      };
    }

    throw new BadRequestException(
      'Cần cung cấp startDestinationId hoặc startCoordinates, hoặc hệ thống phải tìm được điểm xuất phát trong tỉnh',
    );
  }

  private async ensureDestinationsExist(ids: number[]): Promise<number[]> {
    const uniqueIds = Array.from(new Set(ids));
    const found = await this.destinationRepo.find({
      where: { id: In(uniqueIds) },
      select: { id: true },
    });

    const foundIds = found.map((d) => d.id);
    const missing = uniqueIds.filter((id) => !foundIds.includes(id));
    if (missing.length) {
      throw new NotFoundException(`Không tìm thấy địa điểm: ${missing.join(', ')}`);
    }
    return foundIds;
  }

  private async findFallbackStart(province?: string): Promise<Destination | null> {
    const qb = this.destinationRepo.createQueryBuilder('dest');
    if (province) {
      qb.where('LOWER(dest.province) = LOWER(:province)', { province });
    }

    qb.orderBy('dest.rating', 'DESC', 'NULLS LAST')
      .addOrderBy('dest.favouriteTimes', 'DESC')
      .addOrderBy('dest.id', 'ASC')
      .limit(1);

    const found = await qb.getOne();
    return found ?? null;
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
        throw new BadRequestException('Start time must be before end time');
      }
    }

    if (destination?.openTime && destination?.closeTime) {
      const openMinutes = this.parseTimeToMinutes(destination.openTime);
      const closeMinutes = this.parseTimeToMinutes(destination.closeTime);

      if (startTime && this.parseTimeToMinutes(startTime) < openMinutes) {
        throw new BadRequestException(
          `Start time must be after opening time (${destination.openTime})`,
        );
      }

      if (startTime && this.parseTimeToMinutes(startTime) > closeMinutes) {
        throw new BadRequestException(
          `Start time must be before closing time (${destination.closeTime})`,
        );
      }

      if (endTime && this.parseTimeToMinutes(endTime) > closeMinutes) {
        throw new BadRequestException(
          `End time must be before closing time (${destination.closeTime})`,
        );
      }

      if (endTime && this.parseTimeToMinutes(endTime) < openMinutes) {
        throw new BadRequestException(
          `End time must be after opening time (${destination.openTime})`,
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
    const today = this.normalizeDate(now);
    const endDatePassed = route.endDate
      ? today > this.normalizeDate(route.endDate)
      : false;

    let nextRouteStatus = route.status;

    // Priority:
    // 1. Draft (if cloned and not set up)
    // 2. Completed (all stops done)
    // 3. Missed if endDate has passed or any stop missed
    // 4. Upcoming/InProgress (based on date)

    if (route.clonedFromRoute && !route.startDate) {
      nextRouteStatus = TravelRouteStatus.DRAFT;
    } else if (allCompleted) {
      nextRouteStatus = TravelRouteStatus.COMPLETED;
    } else if (endDatePassed || hasMissed) {
      nextRouteStatus = TravelRouteStatus.MISSED;
    } else if (route.startDate) {
      const routeStart = this.normalizeDate(route.startDate);
      if (today < routeStart) {
        nextRouteStatus = TravelRouteStatus.UPCOMING;
      } else {
        nextRouteStatus = TravelRouteStatus.IN_PROGRESS;
      }
    } else if (nextRouteStatus !== TravelRouteStatus.DRAFT) {
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
        continue;
      }

      const sortable = dayStops
        .map((stop) => ({
          stop,
          start: stop.startTime ? this.parseTimeToMinutes(stop.startTime) : null,
          end: stop.endTime ? this.parseTimeToMinutes(stop.endTime) : null,
        }))
        .sort((a, b) => {
          if (a.start === null && b.start === null) return 0;
          if (a.start === null) return 1;
          if (b.start === null) return -1;
          return a.start - b.start;
        });

      for (let idx = 0; idx < sortable.length - 1; idx += 1) {
        const current = sortable[idx];
        const next = sortable[idx + 1];

        if (current.start === null || next.start === null) {
          continue; // cannot validate without start times
        }

        const currentEnd = current.end ?? current.start;
        const nextStart = next.start;

        if (currentEnd > nextStart) {
          throw new BadRequestException(
            `Thời gian điểm dừng (sequence ${current.stop.sequence}) bị chồng với sequence ${next.stop.sequence} trên cùng ngày`,
          );
        }
      }
    }
  }

  private resequenceStops(stops: RouteStop[]): void {
    const stopsByDay = new Map<number, RouteStop[]>();
    for (const stop of stops) {
      const list = stopsByDay.get(stop.dayOrder) ?? [];
      list.push(stop);
      stopsByDay.set(stop.dayOrder, list);
    }

    for (const [day, dayStops] of stopsByDay.entries()) {
      dayStops.sort((a, b) => {
        const timeA = a.startTime ? this.parseTimeToMinutes(a.startTime) : -1;
        const timeB = b.startTime ? this.parseTimeToMinutes(b.startTime) : -1;
        
        if (timeA !== timeB) {
          if (timeA === -1) return 1;
          if (timeB === -1) return -1;
          return timeA - timeB;
        }
        
        // Maintain relative order for stops at the same time
        return (a.sequence ?? 0) - (b.sequence ?? 0) || (a.id ?? 0) - (b.id ?? 0);
      });

      dayStops.forEach((stop, index) => {
        stop.sequence = index + 1;
      });
    }
  }
}
