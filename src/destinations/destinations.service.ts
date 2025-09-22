import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './destinations.entity';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private readonly repo: Repository<Destination>,
  ) {}

  async create(dto: CreateDestinationDto) {
    const destination = this.repo.create(dto);
    return this.repo.save(destination);
  }

  async findAll(params?: { q?: string; available?: boolean; limit?: number; offset?: number }) {
    const { q, available, limit = 50, offset = 0 } = params || {};
    const qb = this.repo.createQueryBuilder('destination');

    if (q) {
      qb.andWhere('(destination.name LIKE :q OR book.author LIKE :q)', { q: `%${q}%` });
    }
    if (typeof available === 'boolean') {
      qb.andWhere('destination.available = :available', { available });
    }

    qb.orderBy('destination.id', 'DESC').take(limit).skip(offset);
    return qb.getMany();
  }

  async findOne(id: number) {
    const destination = await this.repo.findOne({ where: { id } });
    if (!destination) throw new NotFoundException(`Địa điểm #${id} không tồn tại`);
    return destination;
  }

  async update(id: number, dto: UpdateDestinationDto) {
    const destination = await this.findOne(id);
    Object.assign(destination, dto);
    return this.repo.save(destination);
  }

  async remove(id: number) {
    const destination = await this.findOne(id);
    await this.repo.remove(destination);
    return { message: 'Đã xoá địa điểm', id };
  }
}