import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentalBill,
  RentalBillStatus,
  RentalBillType,
} from './entities/rental-bill.entity';
import { RentalBillDetail } from './entities/rental-bill-detail.entity';
import { CreateRentalBillDto } from './dto/create-rental-bill.dto';
import { UpdateRentalBillDto } from './dto/update-rental-bill.dto';
import {
  RentalVehicle,
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../rental-vehicle/entities/rental-vehicle.entity';
import { User } from '../user/entities/user.entity';
import { assignDefined } from '../../common/utils/object.util';
import { VouchersService } from '../voucher/voucher.service';
import { Voucher } from '../voucher/entities/voucher.entity';

@Injectable()
export class RentalBillsService {
  constructor(
    @InjectRepository(RentalBill)
    private readonly billRepo: Repository<RentalBill>,
    @InjectRepository(RentalBillDetail)
    private readonly detailRepo: Repository<RentalBillDetail>,
    @InjectRepository(RentalVehicle)
    private readonly vehicleRepo: Repository<RentalVehicle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly vouchersService: VouchersService,
  ) {}

  private formatMoney(value: number | undefined): string {
    if (value === undefined || value === null) {
      return '0.00';
    }
    return value.toFixed(2);
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `RB${timestamp}${random}`;
  }

  private async resolveVoucher(voucherCode?: string): Promise<Voucher | null> {
    if (!voucherCode) {
      return null;
    }
    const voucher = await this.vouchersService.findByCode(voucherCode);
    if (!voucher) {
      throw new NotFoundException(`Voucher ${voucherCode} not found`);
    }
    return voucher;
  }

  async create(userId: number, dto: CreateRentalBillDto): Promise<RentalBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    const vehicles = await Promise.all(
      dto.details.map(async (detail) => {
        const vehicle = await this.vehicleRepo.findOne({
          where: { licensePlate: detail.licensePlate },
        });
        if (!vehicle) {
          throw new NotFoundException(
            `Vehicle ${detail.licensePlate} not found`,
          );
        }
        if (vehicle.status !== RentalVehicleApprovalStatus.APPROVED) {
          throw new BadRequestException(
            `Vehicle ${detail.licensePlate} is not approved for rental`,
          );
        }
        if (
          vehicle.availability !== RentalVehicleAvailabilityStatus.AVAILABLE
        ) {
          throw new BadRequestException(
            `Vehicle ${detail.licensePlate} is not available`,
          );
        }
        return vehicle;
      }),
    );

    if (!vehicles.length) {
      throw new BadRequestException('At least one vehicle detail is required');
    }

    const referenceContractId = vehicles[0].contractId;
    if (
      vehicles.some((vehicle) => vehicle.contractId !== referenceContractId)
    ) {
      throw new BadRequestException(
        'All vehicles in a bill must belong to the same rental contract',
      );
    }

    const voucher = await this.resolveVoucher(dto.voucherCode);

    const totalFromDetails = dto.details.reduce(
      (sum, detail) => sum + detail.price * (detail.quantity ?? 1),
      0,
    );
    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      userId,
      rentalType: dto.rentalType ?? RentalBillType.DAILY,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      location: dto.location,
      paymentMethod: dto.paymentMethod,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      voucherId: voucher?.id,
      voucher: voucher ?? undefined,
      travelPointsUsed: dto.travelPointsUsed ?? 0,
      status: dto.status ?? RentalBillStatus.PENDING,
      statusReason: dto.statusReason,
      citizenBackPhoto: dto.citizenBackPhoto,
      verifiedSelfiePhoto: dto.verifiedSelfiePhoto,
      notes: dto.notes,
      total: this.formatMoney(dto.total ?? totalFromDetails),
      details: dto.details.map((detail) =>
        this.detailRepo.create({
          licensePlate: detail.licensePlate,
          price: this.formatMoney(detail.price),
          quantity: detail.quantity ?? 1,
          note: detail.note,
        }),
      ),
    });

    const saved = await this.billRepo.save(bill);

    if (
      bill.status === RentalBillStatus.CONFIRMED ||
      bill.status === RentalBillStatus.PAID
    ) {
      await this.updateVehicleAvailability(
        vehicles,
        RentalVehicleAvailabilityStatus.RENTED,
      );
    }

    if (bill.status === RentalBillStatus.COMPLETED) {
      const quantities = dto.details.reduce<Record<string, number>>(
        (acc, detail) => {
          acc[detail.licensePlate] = detail.quantity ?? 1;
          return acc;
        },
        {},
      );
      await this.incrementVehicleRentals(vehicles, quantities);
      await this.updateVehicleAvailability(
        vehicles,
        RentalVehicleAvailabilityStatus.AVAILABLE,
      );
    }

    return this.findOne(saved.id, userId);
  }

  async findAll(
    userId: number,
    params: {
      status?: RentalBillStatus;
    } = {},
  ): Promise<RentalBill[]> {
    const { status } = params;
    const qb = this.billRepo.createQueryBuilder('bill');

    qb.andWhere('bill.userId = :userId', { userId });

    if (status) {
      qb.andWhere('bill.status = :status', { status });
    }

    return qb
      .leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('details.vehicle', 'vehicle')
      .leftJoinAndSelect('bill.user', 'user')
      .leftJoinAndSelect('bill.voucher', 'voucher')
      .orderBy('bill.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: ['details', 'details.vehicle', 'user', 'voucher'],
    });
    if (!bill) {
      throw new NotFoundException(`Rental bill ${id} not found`);
    }
    if (bill.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this rental bill',
      );
    }
    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateRentalBillDto,
  ): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);

    if (dto.details) {
      await this.detailRepo.delete({ billId: id });
      bill.details = dto.details.map((detail) =>
        this.detailRepo.create({
          licensePlate: detail.licensePlate,
          price: this.formatMoney(detail.price),
          quantity: detail.quantity ?? 1,
          note: detail.note,
        }),
      );

      const vehiclesForDetails = await Promise.all(
        dto.details.map(async (detail) =>
          this.vehicleRepo.findOne({
            where: { licensePlate: detail.licensePlate },
          }),
        ),
      );

      if (vehiclesForDetails.some((vehicle) => !vehicle)) {
        throw new NotFoundException(
          'One or more vehicles in details were not found',
        );
      }

      const primaryContract = vehiclesForDetails[0]!.contractId;
      if (
        vehiclesForDetails.some(
          (vehicle) => vehicle!.status !== RentalVehicleApprovalStatus.APPROVED,
        )
      ) {
        throw new BadRequestException(
          'All vehicles must be approved before updating the bill',
        );
      }

      if (
        vehiclesForDetails.some(
          (vehicle) =>
            vehicle!.availability !== RentalVehicleAvailabilityStatus.AVAILABLE,
        )
      ) {
        throw new BadRequestException(
          'All vehicles must be available before updating the bill',
        );
      }

      if (
        vehiclesForDetails.some(
          (vehicle) => vehicle!.contractId !== primaryContract,
        )
      ) {
        throw new BadRequestException(
          'All vehicles in a bill must belong to the same rental contract',
        );
      }

      if (dto.total === undefined) {
        const calculated = dto.details.reduce(
          (sum, detail) => sum + detail.price * (detail.quantity ?? 1),
          0,
        );
        bill.total = this.formatMoney(calculated);
      }
    }

    if (dto.total !== undefined) {
      bill.total = this.formatMoney(dto.total);
    }

    if (dto.startDate !== undefined) {
      bill.startDate = new Date(dto.startDate);
    }

    if (dto.endDate !== undefined) {
      bill.endDate = new Date(dto.endDate);
    }

    assignDefined(bill, {
      rentalType: dto.rentalType,
      location: dto.location,
      paymentMethod: dto.paymentMethod,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      travelPointsUsed: dto.travelPointsUsed,
      citizenBackPhoto: dto.citizenBackPhoto,
      verifiedSelfiePhoto: dto.verifiedSelfiePhoto,
      notes: dto.notes,
    });

    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        bill.voucher = undefined;
        bill.voucherId = undefined;
      } else {
        const voucher = await this.resolveVoucher(dto.voucherCode);
        bill.voucher = voucher ?? undefined;
        bill.voucherId = voucher?.id;
      }
    }

    if (dto.status) {
      bill.status = dto.status;
      bill.statusReason = dto.statusReason;
      if (
        dto.status === RentalBillStatus.CONFIRMED ||
        dto.status === RentalBillStatus.PAID
      ) {
        const vehicles = await Promise.all(
          bill.details.map(async (detail) =>
            this.vehicleRepo.findOne({
              where: { licensePlate: detail.licensePlate },
            }),
          ),
        );
        await this.updateVehicleAvailability(
          vehicles.filter((vehicle): vehicle is RentalVehicle => !!vehicle),
          RentalVehicleAvailabilityStatus.RENTED,
        );
      }
      if (
        dto.status === RentalBillStatus.CANCELLED ||
        dto.status === RentalBillStatus.COMPLETED
      ) {
        const vehicles = await Promise.all(
          bill.details.map(async (detail) =>
            this.vehicleRepo.findOne({
              where: { licensePlate: detail.licensePlate },
            }),
          ),
        );
        await this.updateVehicleAvailability(
          vehicles.filter((vehicle): vehicle is RentalVehicle => !!vehicle),
          RentalVehicleAvailabilityStatus.AVAILABLE,
        );
        if (dto.status === RentalBillStatus.COMPLETED) {
          const quantities = bill.details.reduce<Record<string, number>>(
            (acc, detail) => {
              acc[detail.licensePlate] = detail.quantity ?? 1;
              return acc;
            },
            {},
          );
          await this.incrementVehicleRentals(
            vehicles.filter((vehicle): vehicle is RentalVehicle => !!vehicle),
            quantities,
          );
        }
      }
    } else if (dto.statusReason) {
      bill.statusReason = dto.statusReason;
    }

    if (bill.startDate >= bill.endDate) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    await this.billRepo.save(bill);
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number): Promise<void> {
    const bill = await this.findOne(id, userId);
    await this.billRepo.remove(bill);
  }

  private async updateVehicleAvailability(
    vehicles: RentalVehicle[],
    availability: RentalVehicleAvailabilityStatus,
  ): Promise<void> {
    if (!vehicles.length) {
      return;
    }

    await Promise.all(
      vehicles.map(async (vehicle) => {
        if (!vehicle) {
          return;
        }
        vehicle.availability = availability;
        await this.vehicleRepo.save(vehicle);
      }),
    );
  }

  private async incrementVehicleRentals(
    vehicles: RentalVehicle[],
    quantities: Record<string, number>,
  ): Promise<void> {
    await Promise.all(
      vehicles.map(async (vehicle) => {
        const count = quantities[vehicle.licensePlate] ?? 1;
        vehicle.totalRentals += count;
        await this.vehicleRepo.save(vehicle);
      }),
    );
  }
}
