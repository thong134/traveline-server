import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Not, In, Repository, LessThan } from 'typeorm';
import {
  RentalVehicle,
} from './entities/rental-vehicle.entity';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
  RentalVehicleType,
} from './enums/rental-vehicle.enum';
import { RentalVehicleMaintenance } from './entities/rental-vehicle-maintenance.entity';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import { SearchRentalVehicleDto } from './dto/search-rental-vehicle.dto';
import { AddMaintenanceDto } from './dto/add-maintenance.dto';
import {
  RentalContract,
  RentalContractStatus,
} from '../rental-contract/entities/rental-contract.entity';
import { VehicleCatalog } from '../vehicle-catalog/entities/vehicle-catalog.entity';
import { User } from '../user/entities/user.entity';
import { RentalBill, RentalBillStatus } from '../rental-bill/entities/rental-bill.entity';
import { RentalBillDetail } from '../rental-bill/entities/rental-bill-detail.entity';
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
    @InjectRepository(RentalBill)
    private readonly billRepo: Repository<RentalBill>,
    @InjectRepository(RentalBillDetail)
    private readonly billDetailRepo: Repository<RentalBillDetail>,
    @InjectRepository(RentalVehicleMaintenance)
    private readonly maintenanceRepo: Repository<RentalVehicleMaintenance>,
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

  private ensurePriceOptional(value?: number | string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const price = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(price)) {
      return undefined;
    }

    return price.toFixed(2);
  }

  private async getVehicleWithOwnerCheck(
    userId: number,
    licensePlate: string,
  ): Promise<RentalVehicle> {
    const vehicle = await this.repo.findOne({
      where: { licensePlate },
      relations: ['vehicleCatalog', 'contract', 'contract.user'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${licensePlate} not found`);
    }

    if (vehicle.contract?.user?.id !== userId) {
      throw new ForbiddenException('You do not have access to this vehicle');
    }

    return vehicle;
  }

  async create(
    userId: number,
    dto: CreateRentalVehicleDto,
    files: VehicleImageFiles = {},
  ): Promise<RentalVehicle> {
    if (!files.vehicleRegistrationFront || !files.vehicleRegistrationBack) {
      throw new BadRequestException(
        'Cần upload đủ ảnh đăng ký xe mặt trước và mặt sau',
      );
    }

    const contract = await this.contractRepo.findOne({
      where: { id: dto.contractId },
      relations: { user: true },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${dto.contractId} not found`);
    }

    if (!contract.user) {
      throw new NotFoundException(
        `Contract ${dto.contractId} does not have an owner`,
      );
    }

    // Verify the user owns this contract
    if (contract.user.id !== userId) {
      throw new ForbiddenException('You do not have access to this contract');
    }

    if (contract.status !== RentalContractStatus.APPROVED) {
      throw new BadRequestException(
        'Contract must be approved before registering vehicles',
      );
    }

    const owner = await this.userRepo.findOne({
      where: { id: contract.user?.id },
    });
    if (!owner) {
      throw new NotFoundException(
        `Contract owner ${contract.user?.id} not found`,
      );
    }

    const vehicleCatalog = await this.vehicleCatalogRepo.findOne({
      where: { id: dto.vehicleCatalogId },
    });
    if (!vehicleCatalog) {
      throw new NotFoundException(
        `Vehicle catalog ${dto.vehicleCatalogId} not found`,
      );
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
      vehicleCatalog: vehicleCatalog,
      pricePerHour: this.ensurePrice(dto.pricePerHour),
      pricePerDay: this.ensurePrice(dto.pricePerDay),
      priceFor4Hours: this.ensurePriceOptional(dto.priceFor4Hours),
      priceFor8Hours: this.ensurePriceOptional(dto.priceFor8Hours),
      priceFor12Hours: this.ensurePriceOptional(dto.priceFor12Hours),
      priceFor2Days: this.ensurePriceOptional(dto.priceFor2Days),
      priceFor3Days: this.ensurePriceOptional(dto.priceFor3Days),
      priceFor5Days: this.ensurePriceOptional(dto.priceFor5Days),
      priceFor7Days: this.ensurePriceOptional(dto.priceFor7Days),
      requirements: dto.requirements,
      description: dto.description,
      // Auto set status and availability
      status: RentalVehicleApprovalStatus.PENDING,
      availability: RentalVehicleAvailabilityStatus.UNAVAILABLE,
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

  async findMyVehicles(
    userId: number,
    params: { status?: RentalVehicleApprovalStatus } = {},
  ): Promise<RentalVehicle[]> {
    const { status } = params;

    const qb = this.repo.createQueryBuilder('vehicle');
    qb.innerJoin('vehicle.contract', 'contract');
    qb.andWhere('contract.userId = :userId', { userId });

    if (status) {
      qb.andWhere('vehicle.status = :status', { status });
    }

    return qb
      .leftJoinAndSelect('vehicle.vehicleCatalog', 'vehicleCatalog')
      .leftJoinAndSelect('vehicle.contract', 'contractSelect')
      .orderBy('vehicle.createdAt', 'DESC')
      .getMany();
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

  async search(params: SearchRentalVehicleDto): Promise<RentalVehicle[]> {
    const { rentalType, minPrice, maxPrice, startDate, endDate, province, vehicleType } = params;

    const qb = this.repo.createQueryBuilder('vehicle');

    // Only show approved and available vehicles
    qb.andWhere('vehicle.status = :status', {
      status: RentalVehicleApprovalStatus.APPROVED,
    });
    qb.andWhere('vehicle.availability = :availability', {
      availability: RentalVehicleAvailabilityStatus.AVAILABLE,
    });

    // Join with contract to get province info
    qb.innerJoin('vehicle.contract', 'contract');
    qb.andWhere('contract.status = :contractStatus', {
      contractStatus: RentalContractStatus.APPROVED,
    });

    // Filter by province (businessProvince from contract)
    if (province) {
      qb.andWhere('LOWER(contract.businessProvince) LIKE LOWER(:province)', {
        province: `%${province}%`,
      });
    }

    if (vehicleType) {
      qb.andWhere('vehicle.vehicleType = :vehicleType', { vehicleType });
    }

    // Price filter based on rental type
    if (rentalType === 'hourly') {
      if (minPrice !== undefined) {
        qb.andWhere('CAST(vehicle.pricePerHour AS DECIMAL) >= :minPrice', {
          minPrice,
        });
      }
      if (maxPrice !== undefined) {
        qb.andWhere('CAST(vehicle.pricePerHour AS DECIMAL) <= :maxPrice', {
          maxPrice,
        });
      }
    } else if (rentalType === 'daily') {
      if (minPrice !== undefined) {
        qb.andWhere('CAST(vehicle.pricePerDay AS DECIMAL) >= :minPrice', {
          minPrice,
        });
      }
      if (maxPrice !== undefined) {
        qb.andWhere('CAST(vehicle.pricePerDay AS DECIMAL) <= :maxPrice', {
          maxPrice,
        });
      }
    } else {
      // If no rental type specified, filter by either hourly or daily price
      if (minPrice !== undefined) {
        qb.andWhere(
          '(CAST(vehicle.pricePerHour AS DECIMAL) >= :minPrice OR CAST(vehicle.pricePerDay AS DECIMAL) >= :minPrice)',
          { minPrice },
        );
      }
      if (maxPrice !== undefined) {
        qb.andWhere(
          '(CAST(vehicle.pricePerHour AS DECIMAL) <= :maxPrice OR CAST(vehicle.pricePerDay AS DECIMAL) <= :maxPrice)',
          { maxPrice },
        );
      }
    }

    // Date availability filter - exclude vehicles that are booked during the requested period
    if (startDate && endDate) {
      const requestedStart = startDate;
      const requestedEnd = endDate;

      // Find all license plates that are booked during the requested period
      const bookedVehiclesSubQuery = this.billDetailRepo
        .createQueryBuilder('detail')
        .select('detail.licensePlate')
        .innerJoin('detail.bill', 'bill')
        .where('bill.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: [RentalBillStatus.CANCELLED, RentalBillStatus.COMPLETED],
        })
        .andWhere(
          // Check for date overlap: 
          // Booked period overlaps if: bookedStart < requestedEnd AND bookedEnd > requestedStart
          '(bill.startDate < :requestedEnd AND bill.endDate > :requestedStart)',
          {
            requestedStart,
            requestedEnd,
          },
        );

      qb.andWhere(
        `vehicle.licensePlate NOT IN (${bookedVehiclesSubQuery.getQuery()})`,
      );
      qb.setParameters(bookedVehiclesSubQuery.getParameters());

      // Also exclude vehicles that are in maintenance during the requested period
      const maintenanceSubQuery = this.maintenanceRepo
        .createQueryBuilder('m')
        .select('m.licensePlate')
        .where('(m.startDate < :requestedEnd AND m.endDate > :requestedStart)', {
          requestedStart,
          requestedEnd,
        });

      qb.andWhere(
        `vehicle.licensePlate NOT IN (${maintenanceSubQuery.getQuery()})`,
      );
      qb.setParameters({ ...qb.getParameters(), ...maintenanceSubQuery.getParameters() });
    }

    return qb
      .leftJoinAndSelect('vehicle.vehicleCatalog', 'vehicleCatalog')
      .leftJoinAndSelect('vehicle.contract', 'contractSelect')
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
    userId: number,
    licensePlate: string,
    dto: UpdateRentalVehicleDto,
  ): Promise<RentalVehicle> {
    const vehicle = await this.getVehicleWithOwnerCheck(userId, licensePlate);

    // Only allow updating prices, requirements, and description
    if (dto.pricePerHour !== undefined) {
      vehicle.pricePerHour = this.ensurePrice(dto.pricePerHour);
    }

    if (dto.pricePerDay !== undefined) {
      vehicle.pricePerDay = this.ensurePrice(dto.pricePerDay);
    }

    if (dto.priceFor4Hours !== undefined) {
      vehicle.priceFor4Hours = this.ensurePriceOptional(dto.priceFor4Hours);
    }

    if (dto.priceFor8Hours !== undefined) {
      vehicle.priceFor8Hours = this.ensurePriceOptional(dto.priceFor8Hours);
    }

    if (dto.priceFor12Hours !== undefined) {
      vehicle.priceFor12Hours = this.ensurePriceOptional(dto.priceFor12Hours);
    }

    if (dto.priceFor2Days !== undefined) {
      vehicle.priceFor2Days = this.ensurePriceOptional(dto.priceFor2Days);
    }

    if (dto.priceFor3Days !== undefined) {
      vehicle.priceFor3Days = this.ensurePriceOptional(dto.priceFor3Days);
    }

    if (dto.priceFor5Days !== undefined) {
      vehicle.priceFor5Days = this.ensurePriceOptional(dto.priceFor5Days);
    }

    if (dto.priceFor7Days !== undefined) {
      vehicle.priceFor7Days = this.ensurePriceOptional(dto.priceFor7Days);
    }

    assignDefined(vehicle, {
      requirements: dto.requirements,
      description: dto.description,
    });

    return this.repo.save(vehicle);
  }

  async remove(userId: number, licensePlate: string): Promise<void> {
    const vehicle = await this.getVehicleWithOwnerCheck(userId, licensePlate);
    await this.repo.remove(vehicle);
    await this.contractRepo.decrement(
      { id: vehicle.contractId },
      'totalVehicles',
      1,
    );
  }

  async approve(licensePlate: string): Promise<RentalVehicle> {
    const vehicle = await this.findOne(licensePlate);

    vehicle.status = RentalVehicleApprovalStatus.APPROVED;
    vehicle.availability = RentalVehicleAvailabilityStatus.AVAILABLE;
    vehicle.rejectedReason = undefined;

    return this.repo.save(vehicle);
  }

  async reject(licensePlate: string, reason: string): Promise<RentalVehicle> {
    if (!reason) {
      throw new BadRequestException('Rejected vehicles require a reason');
    }

    const vehicle = await this.findOne(licensePlate);

    vehicle.status = RentalVehicleApprovalStatus.REJECTED;
    vehicle.availability = RentalVehicleAvailabilityStatus.UNAVAILABLE;
    vehicle.rejectedReason = reason;

    return this.repo.save(vehicle);
  }

  async disable(userId: number, licensePlate: string): Promise<RentalVehicle> {
    const vehicle = await this.getVehicleWithOwnerCheck(userId, licensePlate);

    // Check for future bookings
    const hasFutureBookings = await this.hasFutureBookings(licensePlate);
    if (hasFutureBookings) {
      throw new BadRequestException(
        'Không thể tạm ngưng xe này vì đang có đơn đặt xe trong tương lai',
      );
    }

    vehicle.availability = RentalVehicleAvailabilityStatus.MAINTENANCE;

    return this.repo.save(vehicle);
  }

  async enable(userId: number, licensePlate: string): Promise<RentalVehicle> {
    const vehicle = await this.getVehicleWithOwnerCheck(userId, licensePlate);

    if (vehicle.status !== RentalVehicleApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved vehicles can be enabled',
      );
    }

    if (vehicle.availability !== RentalVehicleAvailabilityStatus.MAINTENANCE) {
      throw new BadRequestException(
        'Vehicle is not in maintenance mode',
      );
    }

    vehicle.availability = RentalVehicleAvailabilityStatus.AVAILABLE;

    return this.repo.save(vehicle);
  }

  async addMaintenance(userId: number, dto: AddMaintenanceDto): Promise<RentalVehicleMaintenance> {
    const vehicle = await this.getVehicleWithOwnerCheck(userId, dto.licensePlate);

    // Check for overlapping maintenance
    const overlap = await this.maintenanceRepo.findOne({
      where: [
        {
          licensePlate: dto.licensePlate,
          startDate: LessThan(dto.endDate),
          endDate: MoreThan(dto.startDate),
        },
      ],
    });

    if (overlap) {
      throw new BadRequestException('Phương tiện đã có lịch bảo trì trùng với thời gian này');
    }

    // Check for overlapping bookings
    const bookings = await this.billDetailRepo.createQueryBuilder('detail')
      .innerJoin('detail.bill', 'bill')
      .where('detail.licensePlate = :licensePlate', { licensePlate: dto.licensePlate })
      .andWhere('bill.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [RentalBillStatus.CANCELLED, RentalBillStatus.COMPLETED],
      })
      .andWhere('(bill.startDate < :endDate AND bill.endDate > :startDate)', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .getOne();

    if (bookings) {
      throw new BadRequestException('Phương tiện đã có lịch khách đặt trong thời gian này');
    }

    const maintenance = this.maintenanceRepo.create({
      ...dto,
      licensePlate: dto.licensePlate,
    });

    return this.maintenanceRepo.save(maintenance);
  }

  private async hasFutureBookings(licensePlate: string): Promise<boolean> {
    // Find any bill details for this vehicle
    const billDetails = await this.billDetailRepo.find({
      where: { licensePlate },
      relations: ['bill'],
    });

    const now = new Date();
    
    // Check if any bills have end date in the future and are not cancelled/completed
    for (const detail of billDetails) {
      if (!detail.bill) continue;
      
      const isActiveStatus = ![
        RentalBillStatus.CANCELLED,
        RentalBillStatus.COMPLETED,
      ].includes(detail.bill.status);
      
      const isFuture = detail.bill.endDate > now;
      
      if (isActiveStatus && isFuture) {
        return true;
      }
    }

    return false;
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

  async findFavoritesByUser(userId: number): Promise<RentalVehicle[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favoriteRentalVehicleIds?.length) {
      return [];
    }

    const plates = user.favoriteRentalVehicleIds;

    const vehicles = await this.repo.find({
      where: { licensePlate: In(plates) },
      relations: ['vehicleCatalog', 'contract'],
    });

    const order = new Map(plates.map((value, index) => [value, index]));
    return vehicles.sort((a, b) => {
      const left = order.get(a.licensePlate) ?? 0;
      const right = order.get(b.licensePlate) ?? 0;
      return left - right;
    });
  }

  async favorite(licensePlate: string, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const vehicle = await this.repo.findOne({ where: { licensePlate } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${licensePlate} not found`);
    }

    const current = user.favoriteRentalVehicleIds ?? [];
    if (!current.includes(licensePlate)) {
      user.favoriteRentalVehicleIds = [...current, licensePlate];
      await this.userRepo.save(user);
    }
  }

  async unfavorite(licensePlate: string, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const current = user.favoriteRentalVehicleIds ?? [];
    if (current.includes(licensePlate)) {
      user.favoriteRentalVehicleIds = current.filter((lp) => lp !== licensePlate);
      await this.userRepo.save(user);
    }
  }
}
