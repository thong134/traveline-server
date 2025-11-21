import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Eatery } from './entities/eatery.entity';
import { CreateEateryDto } from './dto/create-eatery.dto';
import { UpdateEateryDto } from './dto/update-eatery.dto';
import { assignDefined } from '../../common/utils/object.util';
import { UsersService } from '../user/user.service';

@Injectable()
export class EateriesService {
  constructor(
    @InjectRepository(Eatery)
    private readonly repo: Repository<Eatery>,
    private readonly usersService: UsersService,
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

  async findAll(params: { province?: string; keyword?: string } = {}): Promise<Eatery[]> {
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

  async favorite(userId: number, eateryId: number): Promise<Eatery> {
    await this.findOne(eateryId);
    await this.usersService.addFavoriteEatery(userId, eateryId);
    return this.findOne(eateryId);
  }

  async unfavorite(userId: number, eateryId: number): Promise<Eatery> {
    await this.findOne(eateryId);
    await this.usersService.removeFavoriteEatery(userId, eateryId);
    return this.findOne(eateryId);
  }
}
