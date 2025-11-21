import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { assignDefined } from '../../common/utils/object.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.repo.create({ name: dto.name.trim() });
    return this.repo.save(category);
  }

  findAll(): Promise<Category[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.repo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category ${id} không tồn tại`);
    }
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    assignDefined(category, {
      name: dto.name?.trim(),
    });
    return this.repo.save(category);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const category = await this.findOne(id);
    await this.repo.remove(category);
    return { id, message: 'Đã xóa loại hình' };
  }
}
