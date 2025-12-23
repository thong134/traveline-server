import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { assignDefined } from '../../common/utils/object.util';

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

  private computeActive(voucher: Voucher, now = new Date()): boolean {
    const expired = voucher.expiresAt ? now > voucher.expiresAt : false;
    const usageExhausted =
      voucher.maxUsage > 0 && voucher.usedCount >= voucher.maxUsage;
    return !expired && !usageExhausted;
  }

  private refreshActive(voucher: Voucher, now = new Date()): void {
    const computedActive = this.computeActive(voucher, now);
    voucher.active = computedActive;
  }

  async create(dto: CreateVoucherDto): Promise<Voucher> {
    const now = new Date();
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
      startsAt: dto.startsAt,
      expiresAt: dto.expiresAt,
    });
    this.refreshActive(voucher, now);
    return this.voucherRepo.save(voucher);
  }

  async findAll(
    params: { active?: boolean; code?: string } = {},
  ): Promise<Voucher[]> {
    const now = new Date();
    const qb = this.voucherRepo.createQueryBuilder('voucher');

    if (params.active !== undefined) {
      qb.andWhere('voucher.active = :active', { active: params.active });
    }

    if (params.code) {
      qb.andWhere('voucher.code = :code', { code: params.code.toUpperCase() });
    }

    const vouchers = await qb.orderBy('voucher.createdAt', 'DESC').getMany();

    const needUpdate: Voucher[] = [];
    const filtered: Voucher[] = [];

    vouchers.forEach((voucher) => {
      const previousActive = voucher.active;
      this.refreshActive(voucher, now);
      if (voucher.active !== previousActive) {
        needUpdate.push(voucher);
      }
      if (params.active === undefined || voucher.active === params.active) {
        filtered.push(voucher);
      }
    });

    if (needUpdate.length) {
      await this.voucherRepo.save(needUpdate);
    }

    return filtered;
  }

  async findOne(id: number): Promise<Voucher> {
    const now = new Date();
    const voucher = await this.voucherRepo.findOne({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher ${id} not found`);
    }
    const previousActive = voucher.active;
    this.refreshActive(voucher, now);
    if (voucher.active !== previousActive) {
      await this.voucherRepo.save(voucher);
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
    const now = new Date();
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
      voucher.startsAt = dto.startsAt;
    }

    if (dto.expiresAt !== undefined) {
      voucher.expiresAt = dto.expiresAt;
    }

    this.refreshActive(voucher, now);
    return this.voucherRepo.save(voucher);
  }

  async incrementUsage(id: number): Promise<void> {
    const now = new Date();
    const voucher = await this.findOne(id);
    voucher.usedCount += 1;
    this.refreshActive(voucher, now);
    await this.voucherRepo.save(voucher);
  }

  async decrementUsage(id: number): Promise<void> {
    const now = new Date();
    const voucher = await this.findOne(id);
    if (voucher.usedCount > 0) {
      voucher.usedCount -= 1;
    }
    this.refreshActive(voucher, now);
    await this.voucherRepo.save(voucher);
  }

  validateVoucherForBooking(
    voucher: Voucher,
    totalAmount: number,
    bookingDate = new Date(),
  ): void {
    this.refreshActive(voucher, bookingDate);
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
