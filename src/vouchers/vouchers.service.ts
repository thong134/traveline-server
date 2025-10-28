import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from './voucher.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
  ) {}

  private formatMoney(value: number | string | undefined): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) {
      return undefined;
    }
    return num.toFixed(2);
  }

  async create(dto: CreateVoucherDto): Promise<Voucher> {
    const existing = await this.voucherRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Voucher code ${dto.code} already exists`);
    }
    const voucher = this.voucherRepo.create({
      code: dto.code.toUpperCase(),
      description: dto.description,
      discountType: dto.discountType,
      value: this.formatMoney(dto.value) ?? '0.00',
      maxDiscountValue: this.formatMoney(dto.maxDiscountValue),
      minOrderValue: this.formatMoney(dto.minOrderValue),
      maxUsage: dto.maxUsage ?? 0,
      usedCount: 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      active: dto.active ?? true,
    });
    return this.voucherRepo.save(voucher);
  }

  async findAll(
    params: { active?: boolean; code?: string } = {},
  ): Promise<Voucher[]> {
    const qb = this.voucherRepo.createQueryBuilder('voucher');

    if (params.active !== undefined) {
      qb.andWhere('voucher.active = :active', { active: params.active });
    }

    if (params.code) {
      qb.andWhere('voucher.code = :code', { code: params.code.toUpperCase() });
    }

    return qb.orderBy('voucher.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepo.findOne({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher ${id} not found`);
    }
    return voucher;
  }

  async findByCode(code: string): Promise<Voucher | null> {
    if (!code) {
      return null;
    }
    return this.voucherRepo.findOne({ where: { code: code.toUpperCase() } });
  }

  async update(id: number, dto: UpdateVoucherDto): Promise<Voucher> {
    const voucher = await this.findOne(id);

    if (dto.code && dto.code.toUpperCase() !== voucher.code) {
      const existing = await this.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Voucher code ${dto.code} already exists`,
        );
      }
      voucher.code = dto.code.toUpperCase();
    }

    assignDefined(voucher, {
      description: dto.description,
      discountType: dto.discountType,
      maxUsage: dto.maxUsage,
      active: dto.active,
    });

    if (dto.value !== undefined) {
      voucher.value = this.formatMoney(dto.value) ?? voucher.value;
    }

    if (dto.maxDiscountValue !== undefined) {
      voucher.maxDiscountValue = this.formatMoney(dto.maxDiscountValue);
    }

    if (dto.minOrderValue !== undefined) {
      voucher.minOrderValue = this.formatMoney(dto.minOrderValue);
    }

    if (dto.startsAt !== undefined) {
      voucher.startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    }

    if (dto.expiresAt !== undefined) {
      voucher.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    }

    return this.voucherRepo.save(voucher);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const voucher = await this.findOne(id);
    await this.voucherRepo.remove(voucher);
    return { id, message: 'Voucher removed' };
  }

  async incrementUsage(id: number): Promise<void> {
    const voucher = await this.findOne(id);
    voucher.usedCount += 1;
    if (voucher.maxUsage > 0 && voucher.usedCount >= voucher.maxUsage) {
      voucher.active = false;
    }
    await this.voucherRepo.save(voucher);
  }

  validateVoucherForBooking(
    voucher: Voucher,
    totalAmount: number,
    bookingDate = new Date(),
  ): void {
    if (!voucher.active) {
      throw new BadRequestException('Voucher is inactive');
    }
    if (voucher.startsAt && bookingDate < voucher.startsAt) {
      throw new BadRequestException('Voucher is not active yet');
    }
    if (voucher.expiresAt && bookingDate > voucher.expiresAt) {
      throw new BadRequestException('Voucher has expired');
    }
    if (voucher.maxUsage > 0 && voucher.usedCount >= voucher.maxUsage) {
      throw new BadRequestException('Voucher usage limit reached');
    }
    const minOrderValue = Number(voucher.minOrderValue ?? 0);
    if (minOrderValue > 0 && totalAmount < minOrderValue) {
      throw new BadRequestException(
        `Minimum order value of ${minOrderValue} not met for voucher`,
      );
    }
  }

  calculateDiscountAmount(voucher: Voucher, totalAmount: number): number {
    const value = Number(voucher.value ?? 0);
    const maxDiscount = Number(voucher.maxDiscountValue ?? 0);
    let discount = 0;

    if (voucher.discountType === 'percentage') {
      discount = (totalAmount * value) / 100;
      if (maxDiscount > 0 && discount > maxDiscount) {
        discount = maxDiscount;
      }
    } else {
      discount = value;
    }

    if (discount > totalAmount) {
      discount = totalAmount;
    }

    return Number(discount.toFixed(2));
  }
}
