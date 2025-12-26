import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Eatery } from './entities/eatery.entity';
import { CreateEateryDto } from './dto/create-eatery.dto';
import { UpdateEateryDto } from './dto/update-eatery.dto';
import { assignDefined } from '../../common/utils/object.util';
import { User } from '../user/entities/user.entity';

@Injectable()
export class EateriesService {
  constructor(
    @InjectRepository(Eatery)
    private readonly repo: Repository<Eatery>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateEateryDto): Promise<Eatery> {
    const eatery = this.repo.create({
      name: dto.name.trim(),
      province: dto.province.trim(),
      address: dto.address.trim(),
      description: dto.description,
      phone: dto.phone,
      imageUrl: dto.imageUrl,
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

  async randomByProvince(province: string): Promise<Eatery> {
    const normalizedProvince = province.trim();
    const eatery = await this.repo
      .createQueryBuilder('eatery')
      .where('LOWER(eatery.province) = LOWER(:province)', {
        province: normalizedProvince,
      })
      .orderBy('RANDOM()')
      .limit(1)
      .getOne();

    if (!eatery) {
      throw new NotFoundException(
        `Không tìm thấy quán ăn tại tỉnh ${normalizedProvince}`,
      );
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
      user.favoriteEaterieIds = current.filter((id) => id !== eateryId.toString());
      await this.userRepo.save(user);
    }
  }
}
