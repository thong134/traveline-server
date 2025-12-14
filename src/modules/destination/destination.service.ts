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
    province?: string;
  }): Promise<Destination[]> {
    const { q, available, limit = 50, offset = 0, province } = params || {};
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
    if (province) {
      qb.andWhere('destination.province = :province', { province });
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

  async unfavoriteDestination(
    userId: number,
    destinationId: number,
  ): Promise<Destination> {
    const destination = await this.findOne(destinationId);
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const destinationKey = destinationId.toString();

    if (!user.favoriteDestinationIds?.includes(destinationKey)) {
      return destination;
    }

    const updatedFavorites = user.favoriteDestinationIds.filter(
      (value) => value !== destinationKey,
    );

    await this.repo.manager.transaction(async (manager) => {
      await manager
        .getRepository(User)
        .update(userId, { favoriteDestinationIds: updatedFavorites });

      const currentCount = destination.favouriteTimes ?? 0;
      const nextCount = currentCount > 0 ? currentCount - 1 : 0;

      await manager
        .getRepository(Destination)
        .update(destinationId, { favouriteTimes: nextCount });
    });

    return this.findOne(destinationId);
  }
}
