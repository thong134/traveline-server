import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentalVehicle,
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from './rental-vehicle.entity';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import {
  RentalContract,
  RentalContractStatus,
} from '../rental-contracts/rental-contract.entity';
import { VehicleCatalog } from '../vehicle-catalog/vehicle-catalog.entity';
import { User } from '../users/entities/user.entity';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class RentalVehiclesService {
  constructor(
    @InjectRepository(RentalVehicle)
    private readonly repo: Repository<RentalVehicle>,
    @InjectRepository(RentalContract)
    private readonly contractRepo: Repository<RentalContract>,
    @InjectRepository(VehicleCatalog)
    private readonly vehicleCatalogRepo: Repository<VehicleCatalog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private ensurePrice(value?: number | string): string {
    if (value === undefined || value === null) {
      return '0.00';
    }

    const price = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(price)) {
      return '0.00';
    }

    return price.toFixed(2);
  }

  async create(dto: CreateRentalVehicleDto): Promise<RentalVehicle> {
    const contract = await this.contractRepo.findOne({
      where: { id: dto.contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${dto.contractId} not found`);
    }

    if (contract.status !== RentalContractStatus.APPROVED) {
      throw new BadRequestException(
        'Contract must be approved before registering vehicles',
      );
    }

    const owner = await this.userRepo.findOne({
      where: { id: contract.userId },
    });
    if (!owner) {
      throw new NotFoundException(
        `Contract owner ${contract.userId} not found`,
      );
    }

    let vehicleCatalog: VehicleCatalog | null = null;
    if (dto.vehicleCatalogId) {
      vehicleCatalog = await this.vehicleCatalogRepo.findOne({
        where: { id: dto.vehicleCatalogId },
      });
      if (!vehicleCatalog) {
        throw new NotFoundException(
          `Vehicle catalog ${dto.vehicleCatalogId} not found`,
        );
      }
    }

    const entity = this.repo.create({
      licensePlate: dto.licensePlate.trim(),
      contractId: dto.contractId,
      vehicleCatalogId: dto.vehicleCatalogId,
      vehicleCatalog: vehicleCatalog ?? undefined,
      pricePerHour: this.ensurePrice(dto.pricePerHour),
      pricePerDay: this.ensurePrice(dto.pricePerDay),
      requirements: dto.requirements,
      description: dto.description,
      status: dto.status ?? RentalVehicleApprovalStatus.PENDING,
      availability:
        dto.availability ?? RentalVehicleAvailabilityStatus.AVAILABLE,
      rejectedReason: undefined,
      totalRentals: 0,
      averageRating: '0.00',
    });

    const saved = await this.repo.save(entity);
    await this.contractRepo.increment(
      { id: dto.contractId },
      'totalVehicles',
      1,
    );
    return saved;
  }

  async findAll(
    params: {
      contractId?: number;
      status?: RentalVehicleApprovalStatus;
      availability?: RentalVehicleAvailabilityStatus;
    } = {},
  ): Promise<RentalVehicle[]> {
    const { contractId, status, availability } = params;
    const qb = this.repo.createQueryBuilder('vehicle');

    if (contractId) {
      qb.andWhere('vehicle.contractId = :contractId', { contractId });
    }

    if (status) {
      qb.andWhere('vehicle.status = :status', { status });
    }

    if (availability) {
      qb.andWhere('vehicle.availability = :availability', { availability });
    }

    return qb
      .leftJoinAndSelect('vehicle.vehicleCatalog', 'definition')
      .leftJoinAndSelect('vehicle.contract', 'contract')
      .orderBy('vehicle.createdAt', 'DESC')
      .getMany();
  }

  async findOne(licensePlate: string): Promise<RentalVehicle> {
    const vehicle = await this.repo.findOne({
      where: { licensePlate },
      relations: ['vehicleCatalog', 'contract'],
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${licensePlate} not found`);
    }
    return vehicle;
  }

  async update(
    licensePlate: string,
    dto: UpdateRentalVehicleDto,
  ): Promise<RentalVehicle> {
    const vehicle = await this.findOne(licensePlate);

    if (
      dto.vehicleCatalogId &&
      dto.vehicleCatalogId !== vehicle.vehicleCatalogId
    ) {
      const info = await this.vehicleCatalogRepo.findOne({
        where: { id: dto.vehicleCatalogId },
      });
      if (!info) {
        throw new NotFoundException(
          `Vehicle catalog ${dto.vehicleCatalogId} not found`,
        );
      }
      vehicle.vehicleCatalog = info;
      vehicle.vehicleCatalogId = info.id;
    }

    if (dto.pricePerHour !== undefined) {
      vehicle.pricePerHour = this.ensurePrice(dto.pricePerHour);
    }

    if (dto.pricePerDay !== undefined) {
      vehicle.pricePerDay = this.ensurePrice(dto.pricePerDay);
    }

    if (dto.status && dto.status !== vehicle.status) {
      vehicle.status = dto.status;
      vehicle.rejectedReason = dto.rejectedReason;
    } else if (dto.rejectedReason) {
      vehicle.rejectedReason = dto.rejectedReason;
    }

    if (dto.availability) {
      vehicle.availability = dto.availability;
    }

    assignDefined(vehicle, {
      requirements: dto.requirements,
      description: dto.description,
    });

    return this.repo.save(vehicle);
  }

  async remove(licensePlate: string): Promise<void> {
    const vehicle = await this.findOne(licensePlate);
    await this.repo.remove(vehicle);
    await this.contractRepo.decrement(
      { id: vehicle.contractId },
      'totalVehicles',
      1,
    );
  }

  async updateAvailability(
    licensePlate: string,
    availability: RentalVehicleAvailabilityStatus,
  ): Promise<RentalVehicle> {
    const vehicle = await this.findOne(licensePlate);
    vehicle.availability = availability;
    return this.repo.save(vehicle);
  }

  async updateStatus(
    licensePlate: string,
    status: RentalVehicleApprovalStatus,
    rejectedReason?: string,
  ): Promise<RentalVehicle> {
    const vehicle = await this.findOne(licensePlate);
    vehicle.status = status;
    vehicle.rejectedReason = rejectedReason;
    return this.repo.save(vehicle);
  }
}
