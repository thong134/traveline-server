import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Destination } from './entities/destinations.entity';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private readonly repo: Repository<Destination>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateDestinationDto): Promise<Destination> {
    const destination = this.repo.create({
      ...dto,
      categories: dto.categories ?? [],
      photos: dto.photos ?? [],
      videos: dto.videos ?? [],
      favouriteTimes: dto.favouriteTimes ?? 0,
      userRatingsTotal: dto.userRatingsTotal ?? 0,
      available: dto.available ?? true,
    });
    return this.repo.save(destination);
  }

  async findAll(params?: {
    q?: string;
    available?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Destination[]> {
    const { q, available, limit = 50, offset = 0 } = params || {};
    const qb = this.repo.createQueryBuilder('destination');

    if (q) {
      qb.andWhere(
        `(
          destination.name ILIKE :q
          OR destination.type ILIKE :q
          OR destination.province ILIKE :q
        )`,
        { q: `%${q}%` },
      );
    }
    if (typeof available === 'boolean') {
      qb.andWhere('destination.available = :available', { available });
    }

    qb.orderBy('destination.createdAt', 'DESC').take(limit).skip(offset);
    return qb.getMany();
  }

  async findOne(id: number): Promise<Destination> {
    const destination = await this.repo.findOne({ where: { id } });
    if (!destination)
      throw new NotFoundException(`Địa điểm #${id} không tồn tại`);
    return destination;
  }

  async update(id: number, dto: UpdateDestinationDto): Promise<Destination> {
    const destination = await this.findOne(id);
    const {
      categories,
      photos,
      videos,
      favouriteTimes,
      userRatingsTotal,
      available,
      ...rest
    } = dto;

    const destinationRecord = destination as unknown as Record<string, unknown>;

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        destinationRecord[key] = value;
      }
    }

    if (categories !== undefined) {
      destination.categories = categories;
    }
    if (photos !== undefined) {
      destination.photos = photos;
    }
    if (videos !== undefined) {
      destination.videos = videos;
    }
    if (favouriteTimes !== undefined) {
      destination.favouriteTimes = favouriteTimes;
    }
    if (userRatingsTotal !== undefined) {
      destination.userRatingsTotal = userRatingsTotal;
    }
    if (available !== undefined) {
      destination.available = available;
    }

    return this.repo.save(destination);
  }

  async remove(id: number): Promise<{ message: string; id: number }> {
    const destination = await this.findOne(id);
    await this.repo.remove(destination);
    return { message: 'Đã xoá địa điểm', id };
  }

  async findFavoritesByUser(userId: number): Promise<Destination[]> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favoriteDestinationIds?.length) {
      return [];
    }

    const ids = user.favoriteDestinationIds
      .map((rawId) => Number(rawId))
      .filter((value) => Number.isInteger(value));

    if (!ids.length) {
      return [];
    }

    const destinations = await this.repo.find({ where: { id: In(ids) } });
    const order = new Map(ids.map((value, index) => [value, index]));
    return destinations.sort((a, b) => {
      const left = order.get(a.id) ?? 0;
      const right = order.get(b.id) ?? 0;
      return left - right;
    });
  }

  async favoriteDestination(
    userId: number,
    destinationId: number,
  ): Promise<Destination> {
    const destination = await this.findOne(destinationId);
    const user = await this.usersRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const destinationKey = destinationId.toString();
    if (user.favoriteDestinationIds?.includes(destinationKey)) {
      return destination;
    }

    const updatedFavorites = Array.isArray(user.favoriteDestinationIds)
      ? [...user.favoriteDestinationIds, destinationKey]
      : [destinationKey];

    await this.repo.manager.transaction(async (manager) => {
      await manager
        .getRepository(User)
        .update(userId, { favoriteDestinationIds: updatedFavorites });
      await manager
        .getRepository(Destination)
        .increment({ id: destinationId }, 'favouriteTimes', 1);
    });

    return this.findOne(destinationId);
  }

  async updateFavoriteDestinations(
    userId: number,
    destinationIds: number[],
  ): Promise<Destination[]> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const normalized = Array.from(
      new Set(
        (destinationIds ?? [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    const currentFavorites = Array.from(
      new Set(
        (user.favoriteDestinationIds ?? [])
          .map((raw) => Number(raw))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    const currentSet = new Set(currentFavorites);
    const nextSet = new Set(normalized);

    const toAdd = normalized.filter((id) => !currentSet.has(id));
    const toRemove = currentFavorites.filter((id) => !nextSet.has(id));

    const destinationMap = new Map<number, Destination>();
    let additions: Destination[] = [];
    if (toAdd.length) {
      additions = await this.repo.find({ where: { id: In(toAdd) } });
      const foundIds = new Set(additions.map((item) => item.id));
      const missing = toAdd.filter((id) => !foundIds.has(id));
      if (missing.length) {
        throw new NotFoundException(`Destination ${missing[0]} not found`);
      }
      for (const item of additions) {
        destinationMap.set(item.id, item);
      }
    }

    let removals: Destination[] = [];
    if (toRemove.length) {
      removals = await this.repo.find({ where: { id: In(toRemove) } });
      for (const item of removals) {
        destinationMap.set(item.id, item);
      }
    }

    await this.repo.manager.transaction(async (manager) => {
      const destinationRepo = manager.getRepository(Destination);
      const userRepo = manager.getRepository(User);

      for (const id of toAdd) {
        const destination = destinationMap.get(id);
        if (destination) {
          destination.favouriteTimes = (destination.favouriteTimes ?? 0) + 1;
        }
      }

      for (const id of toRemove) {
        const destination = destinationMap.get(id);
        if (destination) {
          destination.favouriteTimes = Math.max(
            0,
            (destination.favouriteTimes ?? 0) - 1,
          );
        }
      }

      if (destinationMap.size) {
        await destinationRepo.save(Array.from(destinationMap.values()));
      }

      await userRepo.update(userId, {
        favoriteDestinationIds: normalized.map((id) => id.toString()),
      });
    });

    return this.findFavoritesByUser(userId);
  }
}
