import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentalBill,
  RentalBillStatus,
  RentalBillType,
} from './rental-bill.entity';
import { RentalBillDetail } from './rental-bill-detail.entity';
import { CreateRentalBillDto } from './dto/create-rental-bill.dto';
import { UpdateRentalBillDto } from './dto/update-rental-bill.dto';
import {
  RentalVehicle,
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../rental-vehicles/rental-vehicle.entity';
import { RentalContract } from '../rental-contracts/rental-contract.entity';
import { User } from '../users/entities/user.entity';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class RentalBillsService {
  constructor(
    @InjectRepository(RentalBill)
    private readonly billRepo: Repository<RentalBill>,
    @InjectRepository(RentalBillDetail)
    private readonly detailRepo: Repository<RentalBillDetail>,
    @InjectRepository(RentalVehicle)
    private readonly vehicleRepo: Repository<RentalVehicle>,
    @InjectRepository(RentalContract)
    private readonly contractRepo: Repository<RentalContract>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

  async create(dto: CreateRentalBillDto): Promise<RentalBill> {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    let contract: RentalContract | null = null;
    if (dto.contractId) {
      contract = await this.contractRepo.findOne({
        where: { id: dto.contractId },
      });
      if (!contract) {
        throw new NotFoundException(`Contract ${dto.contractId} not found`);
      }
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

    if (!contract) {
      contract = await this.contractRepo.findOne({
        where: { id: referenceContractId },
      });
    }

    if (dto.contractId && dto.contractId !== referenceContractId) {
      throw new BadRequestException(
        'Selected vehicles do not belong to the provided contract',
      );
    }

    if (
      vehicles.some((vehicle) => vehicle.contractId !== referenceContractId)
    ) {
      throw new BadRequestException(
        'All vehicles in a bill must belong to the same contract',
      );
    }

    const totalFromDetails = dto.details.reduce(
      (sum, detail) => sum + detail.price * (detail.quantity ?? 1),
      0,
    );
    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      userId: dto.userId,
      rentalType: dto.rentalType ?? RentalBillType.DAILY,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      location: dto.location,
      paymentMethod: dto.paymentMethod,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      voucherCode: dto.voucherCode,
      travelPointsUsed: dto.travelPointsUsed ?? 0,
      status: dto.status ?? RentalBillStatus.PENDING,
      statusReason: dto.statusReason,
      citizenBackPhoto: dto.citizenBackPhoto,
      verifiedSelfiePhoto: dto.verifiedSelfiePhoto,
      notes: dto.notes,
      contractId: dto.contractId ?? referenceContractId,
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
      await this.incrementVehicleRentals(vehicles, quantities, bill.contractId);
      await this.updateVehicleAvailability(
        vehicles,
        RentalVehicleAvailabilityStatus.AVAILABLE,
      );
    }

    return this.findOne(saved.id);
  }

  async findAll(
    params: {
      userId?: number;
      status?: RentalBillStatus;
      contractId?: number;
    } = {},
  ): Promise<RentalBill[]> {
    const { userId, status, contractId } = params;
    const qb = this.billRepo.createQueryBuilder('bill');

    if (userId) {
      qb.andWhere('bill.userId = :userId', { userId });
    }

    if (status) {
      qb.andWhere('bill.status = :status', { status });
    }

    if (contractId) {
      qb.andWhere('bill.contractId = :contractId', { contractId });
    }

    return qb
      .leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('details.vehicle', 'vehicle')
      .leftJoinAndSelect('bill.user', 'user')
      .leftJoinAndSelect('bill.contract', 'contract')
      .orderBy('bill.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: ['details', 'details.vehicle', 'user', 'contract'],
    });
    if (!bill) {
      throw new NotFoundException(`Rental bill ${id} not found`);
    }
    return bill;
  }

  async update(id: number, dto: UpdateRentalBillDto): Promise<RentalBill> {
    const bill = await this.findOne(id);

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
          'All vehicles in a bill must belong to the same contract',
        );
      }

      bill.contractId = primaryContract;

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
      voucherCode: dto.voucherCode,
      travelPointsUsed: dto.travelPointsUsed,
      citizenBackPhoto: dto.citizenBackPhoto,
      verifiedSelfiePhoto: dto.verifiedSelfiePhoto,
      notes: dto.notes,
    });

    if (dto.contractId !== undefined) {
      const contract = await this.contractRepo.findOne({
        where: { id: dto.contractId },
      });
      if (!contract) {
        throw new NotFoundException(`Contract ${dto.contractId} not found`);
      }

      const vehicles = await Promise.all(
        bill.details.map(async (detail) =>
          this.vehicleRepo.findOne({
            where: { licensePlate: detail.licensePlate },
          }),
        ),
      );
      if (
        vehicles.some(
          (vehicle) => vehicle && vehicle.contractId !== contract.id,
        )
      ) {
        throw new BadRequestException(
          'All vehicles must belong to the target contract',
        );
      }

      bill.contractId = contract.id;
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
            bill.contractId,
          );
        }
      }
    } else if (dto.statusReason) {
      bill.statusReason = dto.statusReason;
    }

    if (bill.startDate >= bill.endDate) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    return this.billRepo.save(bill);
  }

  async remove(id: number): Promise<void> {
    const bill = await this.findOne(id);
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
    contractId?: number,
  ): Promise<void> {
    await Promise.all(
      vehicles.map(async (vehicle) => {
        const count = quantities[vehicle.licensePlate] ?? 1;
        vehicle.totalRentals += count;
        await this.vehicleRepo.save(vehicle);
      }),
    );

    if (contractId) {
      const totalCount =
        Object.values(quantities).reduce((sum, qty) => sum + qty, 0) || 1;
      await this.contractRepo.increment(
        { id: contractId },
        'totalRentalTimes',
        totalCount,
      );
    }
  }
}
