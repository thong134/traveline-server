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
import { VehicleInformation } from '../vehicle-information/vehicle-information.entity';
import { User } from '../users/entities/user.entity';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class RentalVehiclesService {
  constructor(
    @InjectRepository(RentalVehicle)
    private readonly repo: Repository<RentalVehicle>,
    @InjectRepository(RentalContract)
    private readonly contractRepo: Repository<RentalContract>,
    @InjectRepository(VehicleInformation)
    private readonly vehicleInfoRepo: Repository<VehicleInformation>,
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

    let vehicleInfo: VehicleInformation | null = null;
    if (dto.vehicleInformationId) {
      vehicleInfo = await this.vehicleInfoRepo.findOne({
        where: { id: dto.vehicleInformationId },
      });
      if (!vehicleInfo) {
        throw new NotFoundException(
          `Vehicle definition ${dto.vehicleInformationId} not found`,
        );
      }
    }

    const defaultRequirements =
      dto.requirements ??
      (vehicleInfo?.defaultRequirements?.length
        ? vehicleInfo.defaultRequirements.join('\n')
        : undefined);

    const entity = this.repo.create({
      licensePlate: dto.licensePlate.trim(),
      contractId: dto.contractId,
      vehicleInformationId: dto.vehicleInformationId,
      vehicleInformation: vehicleInfo ?? undefined,
      vehicleType: vehicleInfo?.type ?? dto.vehicleType,
      vehicleBrand: vehicleInfo?.brand ?? dto.vehicleBrand,
      vehicleModel: vehicleInfo?.model ?? dto.vehicleModel,
      vehicleColor: vehicleInfo?.color ?? dto.vehicleColor,
      manufactureYear: dto.manufactureYear,
      pricePerHour: this.ensurePrice(dto.pricePerHour),
      pricePerDay: this.ensurePrice(dto.pricePerDay),
      requirements: defaultRequirements,
      vehicleRegistrationFront: dto.vehicleRegistrationFront,
      vehicleRegistrationBack: dto.vehicleRegistrationBack,
      photoUrls: dto.photoUrls?.length
        ? dto.photoUrls
        : vehicleInfo?.photo
          ? [vehicleInfo.photo]
          : [],
      description: dto.description,
      status: dto.status ?? RentalVehicleApprovalStatus.PENDING,
      availability:
        dto.availability ?? RentalVehicleAvailabilityStatus.AVAILABLE,
      externalId: dto.externalId,
      statusReason: undefined,
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
      .leftJoinAndSelect('vehicle.vehicleInformation', 'definition')
      .leftJoinAndSelect('vehicle.contract', 'contract')
      .orderBy('vehicle.createdAt', 'DESC')
      .getMany();
  }

  async findOne(licensePlate: string): Promise<RentalVehicle> {
    const vehicle = await this.repo.findOne({
      where: { licensePlate },
      relations: ['vehicleInformation', 'contract'],
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
      dto.vehicleInformationId &&
      dto.vehicleInformationId !== vehicle.vehicleInformationId
    ) {
      const info = await this.vehicleInfoRepo.findOne({
        where: { id: dto.vehicleInformationId },
      });
      if (!info) {
        throw new NotFoundException(
          `Vehicle definition ${dto.vehicleInformationId} not found`,
        );
      }
      vehicle.vehicleInformation = info;
      vehicle.vehicleInformationId = info.id;
      vehicle.vehicleType = info.type;
      vehicle.vehicleBrand = info.brand;
      vehicle.vehicleModel = info.model;
      vehicle.vehicleColor = info.color;
    }

    if (dto.pricePerHour !== undefined) {
      vehicle.pricePerHour = this.ensurePrice(dto.pricePerHour);
    }

    if (dto.pricePerDay !== undefined) {
      vehicle.pricePerDay = this.ensurePrice(dto.pricePerDay);
    }

    if (dto.photoUrls) {
      vehicle.photoUrls = dto.photoUrls;
    }

    if (dto.status && dto.status !== vehicle.status) {
      vehicle.status = dto.status;
      vehicle.statusReason = dto.statusReason;
    } else if (dto.statusReason) {
      vehicle.statusReason = dto.statusReason;
    }

    if (dto.availability) {
      vehicle.availability = dto.availability;
    }

    assignDefined(vehicle, {
      vehicleType: dto.vehicleType,
      vehicleBrand: dto.vehicleBrand,
      vehicleModel: dto.vehicleModel,
      vehicleColor: dto.vehicleColor,
      manufactureYear: dto.manufactureYear,
      requirements: dto.requirements,
      vehicleRegistrationFront: dto.vehicleRegistrationFront,
      vehicleRegistrationBack: dto.vehicleRegistrationBack,
      description: dto.description,
      externalId: dto.externalId,
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
    statusReason?: string,
  ): Promise<RentalVehicle> {
    const vehicle = await this.findOne(licensePlate);
    vehicle.status = status;
    vehicle.statusReason = statusReason;
    return this.repo.save(vehicle);
  }
}
