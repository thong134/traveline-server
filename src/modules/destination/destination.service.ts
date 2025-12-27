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

  async favorite(destinationId: number, userId: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const destination = await this.repo.findOne({ where: { id: destinationId } });
    if (!destination) {
      throw new NotFoundException(`Destination ${destinationId} not found`);
    }

    const current = user.favoriteDestinationIds ?? [];
    if (!current.includes(destinationId.toString())) {
      user.favoriteDestinationIds = [...current, destinationId.toString()];
      await this.usersRepo.save(user);
    }
  }

  async unfavorite(destinationId: number, userId: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const current = user.favoriteDestinationIds ?? [];
    if (current.includes(destinationId.toString())) {
      user.favoriteDestinationIds = current.filter((id) => id !== destinationId.toString());
      await this.usersRepo.save(user);
    }
  }

  // Hobby to Category mapping
  private readonly hobbyToCategoryMap: Record<string, string[]> = {
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

  async recommendForUser(
    userId: number,
    province?: string,
    limit: number = 10,
  ): Promise<Destination[]> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Map user hobbies to destination categories
    const targetCategories = new Set<string>();
    for (const hobby of user.hobbies || []) {
      const mapped = this.hobbyToCategoryMap[hobby] || [];
      mapped.forEach((cat) => targetCategories.add(cat));
    }

    // Build query
    const qb = this.repo.createQueryBuilder('destination');
    qb.where('destination.available = :available', { available: true });

    if (province) {
      qb.andWhere('destination.province ILIKE :province', { province: `%${province}%` });
    }

    // Get all matching destinations
    const allDestinations = await qb.getMany();

    // Score each destination
    const scored = allDestinations.map((dest) => {
      let score = 0;

      // Category match score (0.5 weight)
      const categoryMatch = (dest.categories || []).some((cat) =>
        targetCategories.has(cat),
      );
      if (categoryMatch) score += 0.5;

      // Popularity score (0.3 weight) - normalize favouriteTimes
      const maxFav = Math.max(...allDestinations.map((d) => d.favouriteTimes || 0), 1);
      score += 0.3 * ((dest.favouriteTimes || 0) / maxFav);

      // Rating score (0.2 weight) - normalize 0-5 rating
      score += 0.2 * ((dest.rating || 0) / 5);

      // Bonus if user already favorited this destination
      if (user.favoriteDestinationIds?.includes(dest.id.toString())) {
        score += 0.1;
      }

      return { destination: dest, score };
    });

    // Sort by score descending and return top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.destination);
  }
}
