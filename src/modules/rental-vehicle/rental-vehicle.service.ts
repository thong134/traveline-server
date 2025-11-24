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
} from './entities/rental-vehicle.entity';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import {
  RentalContract,
  RentalContractStatus,
} from '../rental-contract/entities/rental-contract.entity';
import { VehicleCatalog } from '../vehicle-catalog/entities/vehicle-catalog.entity';
import { User } from '../user/entities/user.entity';
import { assignDefined } from '../../common/utils/object.util';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import type { Express } from 'express';
import { assertImageFile } from '../../common/upload/image-upload.utils';

type VehicleImageFiles = {
  vehicleRegistrationFront?: Express.Multer.File;
  vehicleRegistrationBack?: Express.Multer.File;
};

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
    private readonly cloudinaryService: CloudinaryService,
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

  async create(
    dto: CreateRentalVehicleDto,
    files: VehicleImageFiles = {},
  ): Promise<RentalVehicle> {
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

    const ownerId = owner.id;

    const registrationFrontUrl = await this.uploadVehicleImage(
      dto.licensePlate,
      ownerId,
      files.vehicleRegistrationFront,
      'registration-front',
    );

    const registrationBackUrl = await this.uploadVehicleImage(
      dto.licensePlate,
      ownerId,
      files.vehicleRegistrationBack,
      'registration-back',
    );

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
      vehicleRegistrationFront: registrationFrontUrl ?? undefined,
      vehicleRegistrationBack: registrationBackUrl ?? undefined,
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
    files: VehicleImageFiles = {},
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

    let ownerId: number | undefined = vehicle.contract?.userId;
    if (ownerId === undefined) {
      const contract = await this.contractRepo.findOne({
        where: { id: vehicle.contractId },
        select: ['id', 'userId'],
      });
      ownerId = contract?.userId;
    }

    if (ownerId === undefined) {
      throw new NotFoundException(
        `Contract owner not found for vehicle ${vehicle.licensePlate}`,
      );
    }

    const frontUrl = await this.uploadVehicleImage(
      vehicle.licensePlate,
      ownerId,
      files.vehicleRegistrationFront,
      'registration-front',
    );
    if (frontUrl) {
      vehicle.vehicleRegistrationFront = frontUrl;
    }

    const backUrl = await this.uploadVehicleImage(
      vehicle.licensePlate,
      ownerId,
      files.vehicleRegistrationBack,
      'registration-back',
    );
    if (backUrl) {
      vehicle.vehicleRegistrationBack = backUrl;
    }

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
    params: {
      status: RentalVehicleApprovalStatus;
      availability?: RentalVehicleAvailabilityStatus;
      rejectedReason?: string;
    },
  ): Promise<RentalVehicle> {
    const vehicle = await this.findOne(licensePlate);

    if (
      params.status === RentalVehicleApprovalStatus.REJECTED &&
      !params.rejectedReason
    ) {
      throw new BadRequestException('Rejected vehicles require a reason');
    }

    vehicle.status = params.status;
    if (params.status === RentalVehicleApprovalStatus.APPROVED) {
      vehicle.rejectedReason = undefined;
    } else if (params.rejectedReason !== undefined) {
      vehicle.rejectedReason = params.rejectedReason;
    } else if (params.status !== RentalVehicleApprovalStatus.REJECTED) {
      vehicle.rejectedReason = undefined;
    }

    if (params.availability) {
      vehicle.availability = params.availability;
    }

    return this.repo.save(vehicle);
  }

  async approve(licensePlate: string): Promise<RentalVehicle> {
    return this.updateStatus(licensePlate, {
      status: RentalVehicleApprovalStatus.APPROVED,
      availability: RentalVehicleAvailabilityStatus.AVAILABLE,
    });
  }

  async reject(licensePlate: string, reason: string): Promise<RentalVehicle> {
    return this.updateStatus(licensePlate, {
      status: RentalVehicleApprovalStatus.REJECTED,
      rejectedReason: reason,
    });
  }

  async disable(licensePlate: string): Promise<RentalVehicle> {
    return this.updateStatus(licensePlate, {
      status: RentalVehicleApprovalStatus.INACTIVE,
      availability: RentalVehicleAvailabilityStatus.MAINTENANCE,
    });
  }

  private async uploadVehicleImage(
    licensePlate: string,
    ownerId: number,
    file: Express.Multer.File | undefined,
    label: string,
  ): Promise<string | undefined> {
    if (!file) {
      return undefined;
    }

    assertImageFile(file, { fieldName: label });
    const upload = await this.cloudinaryService.uploadImage(file, {
      folder: `traveline/rental-vehicles/${ownerId}`,
      publicId: `${licensePlate}_${label}`,
    });
    return upload.url;
  }
}
