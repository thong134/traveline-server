import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Eatery } from './entities/eatery.entity';
import { CreateEateryDto } from './dto/create-eatery.dto';
import { UpdateEateryDto } from './dto/update-eatery.dto';
import { assignDefined } from '../../common/utils/object.util';
import { User } from '../user/entities/user.entity';
import { MapService } from '../../common/map/map.service';
import { calculateDistance } from '../../common/utils/location.util';

@Injectable()
export class EateriesService {
  constructor(
    @InjectRepository(Eatery)
    private readonly repo: Repository<Eatery>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mapService: MapService,
  ) {}

  private readonly logger = new Logger(EateriesService.name);

  async create(dto: CreateEateryDto): Promise<Eatery> {
    const eatery = this.repo.create({
      name: dto.name.trim(),
      province: dto.province.trim(),
      address: dto.address.trim(),
      description: dto.description,
      phone: dto.phone,
      imageUrl: dto.imageUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    return this.repo.save(eatery);
  }

  async findAll(
    params: { province?: string; keyword?: string } = {},
  ): Promise<Eatery[]> {
    const { province, keyword } = params;
    const where: Record<string, unknown> = {};

    if (province) {
      where.province = province;
    }

    if (keyword) {
      where.name = ILike(`%${keyword}%`);
    }

    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async searchNearby(query: {
    latitude: number;
    longitude: number;
  }): Promise<(Eatery & { distance: number })[]> {
    this.logger.log(`Searching nearby eateries: ${JSON.stringify(query)}`);

    const NEARBY_RADIUS_KM = 50; // Bán kính tìm kiếm
    const MAX_RESULTS = 30; // Giới hạn số kết quả trả về

    // Fetch tất cả eateries có tọa độ và tính Haversine distance (instant)
    const allEateries = await this.repo.find({
      where: {},
    });

    const withDistance = allEateries
      .filter(e => e.latitude != null && e.longitude != null)
      .map(e => ({
        ...e,
        distance: calculateDistance(
          query.latitude,
          query.longitude,
          e.latitude!,
          e.longitude!,
        ),
      }));

    // Lọc theo bán kính + sắp xếp + giới hạn số lượng
    const results = withDistance
      .filter(e => e.distance <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_RESULTS);

    this.logger.log(`Found ${results.length} nearby eateries`);

    return results;
  }



  async random(query: {
    province?: string;
    ids?: string;
    scope?: 'all' | 'favorites';
    userId?: number;
  }): Promise<Eatery> {
    const { province, ids, scope, userId } = query;

    let qb = this.repo.createQueryBuilder('eatery');
    let hasCondition = false;

    if (ids) {
       const idList = ids.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
       if (idList.length > 0) {
          qb.where('eatery.id IN (:...idList)', { idList });
          hasCondition = true;
       }
    }

    if (scope === 'favorites' && userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || !user.favoriteEaterieIds?.length) {
        throw new NotFoundException('Danh sách yêu thích trống');
      }
      const favIds = user.favoriteEaterieIds
        .map((id) => Number(id))
        .filter((id) => !isNaN(id));
      
      if (favIds.length === 0) {
         throw new NotFoundException('Danh sách yêu thích trống');
      }

      // If already filtered by ids, we should intersect or prioritize?
      // Requirement: Random from adhoc list (ids) OR valid favorites.
      // Usually adhoc list implies explicit selection.
      // But if both provided, intersection makes sense (pick from selected that are also favorites?)
      // Let's assume simpler: if ids provided, use ids. if scope provided, use scope.
      // But currently ids filter is already applied above.
      
      // Let's chain conditions:
      if (hasCondition) {
          qb.andWhereInIds(favIds);
      } else {
          qb.whereInIds(favIds);
          hasCondition = true;
      }
    } 
    
    if (province && !hasCondition) {
      // Only filter by province if no specific IDs or Favorites scope applied
      // OR should we allow filtering by province within favorites?
      // Let's stick to: if IDs provided, province ignored (user picked specific items).
      // If Favorites provided, province filters favorites? Maybe.
      // For now, let's keep province filter independent unless specific IDs used.
      
      const normalizedProvince = province.trim();
      if (hasCondition) {
         qb.andWhere('LOWER(eatery.province) = LOWER(:province)', { province: normalizedProvince });
      } else {
         qb.where('LOWER(eatery.province) = LOWER(:province)', { province: normalizedProvince });
      }
    }

    const eatery = await qb.orderBy('RANDOM()').limit(1).getOne();

    if (!eatery) {
      throw new NotFoundException('Không tìm thấy quán ăn phù hợp');
    }

    return eatery;
  }

  async findOne(id: number): Promise<Eatery> {
    const eatery = await this.repo.findOne({ where: { id } });
    if (!eatery) {
      throw new NotFoundException(`Eatery ${id} không tồn tại`);
    }
    return eatery;
  }

  async update(id: number, dto: UpdateEateryDto): Promise<Eatery> {
    const eatery = await this.findOne(id);
    assignDefined(eatery, {
      name: dto.name?.trim(),
      province: dto.province?.trim(),
      address: dto.address?.trim(),
      description: dto.description,
      phone: dto.phone,
      imageUrl: dto.imageUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    return this.repo.save(eatery);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const eatery = await this.findOne(id);
    await this.repo.remove(eatery);
    return { id, message: 'Đã xóa quán ăn' };
  }

  async findFavoritesByUser(userId: number): Promise<Eatery[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favoriteEaterieIds?.length) {
      return [];
    }

    const ids = user.favoriteEaterieIds
      .map((rawId) => Number(rawId))
      .filter((value) => !Number.isNaN(value) && Number.isInteger(value));

    if (!ids.length) {
      return [];
    }

    const eateries = await this.repo.find({
      where: { id: In(ids) },
    });

    const order = new Map(ids.map((value, index) => [value, index]));
    return eateries.sort((a, b) => {
      const left = order.get(a.id) ?? 0;
      const right = order.get(b.id) ?? 0;
      return left - right;
    });
  }

  async favorite(eateryId: number, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const eatery = await this.repo.findOne({ where: { id: eateryId } });
    if (!eatery) {
      throw new NotFoundException(`Eatery ${eateryId} not found`);
    }

    const current = user.favoriteEaterieIds ?? [];
    if (!current.includes(eateryId.toString())) {
      user.favoriteEaterieIds = [...current, eateryId.toString()];
      await this.userRepo.save(user);
    }
  }

  async unfavorite(eateryId: number, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const current = user.favoriteEaterieIds ?? [];
    if (current.includes(eateryId.toString())) {
      user.favoriteEaterieIds = current.filter(
        (id) => id !== eateryId.toString(),
      );
      await this.userRepo.save(user);
    }
  }

  async dumpNames(): Promise<{ id: number; name: string; province: string }[]> {
    return this.repo.find({
      select: ['id', 'name', 'province'],
      order: { province: 'ASC', name: 'ASC' },
    });
  }
}
