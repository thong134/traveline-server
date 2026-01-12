import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cooperation } from './entities/cooperation.entity';
import { CooperationContract } from './entities/cooperation-contract.entity';
import { CooperationStatus } from './entities/cooperation-enums';
import { CreateCooperationDto } from './dto/create-cooperation.dto';
import { RegisterCooperationDto } from './dto/register-cooperation.dto';
import { ApproveCooperationDto } from './dto/approve-cooperation.dto';
import { UploadContractDto } from './dto/upload-contract.dto';
import { UpdateCooperationDto } from './dto/update-cooperation.dto';
import { User } from '../user/entities/user.entity';
import { assignDefined } from '../../common/utils/object.util';
import { UsersService } from '../user/user.service';

@Injectable()
export class CooperationsService {
  constructor(
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CooperationContract)
    private readonly contractRepo: Repository<CooperationContract>,
    private readonly usersService: UsersService,
  ) {}

  private formatMoney(value: number | string | undefined): string {
    if (value === undefined || value === null) {
      return '0.00';
    }
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) {
      return '0.00';
    }
    return num.toFixed(2);
  }

  async create(dto: CreateCooperationDto): Promise<Cooperation> {
    const cooperation = this.cooperationRepo.create({
      name: dto.name,
      type: dto.type,
      code: dto.code,
      numberOfObjects: dto.numberOfObjects ?? 0,
      numberOfObjectTypes: dto.numberOfObjectTypes ?? 0,
      bossName: dto.bossName,
      bossPhone: dto.bossPhone,
      bossEmail: dto.bossEmail,
      address: dto.address,
      district: dto.district,
      city: dto.city,
      province: dto.province,
      photo: dto.photo,
      extension: dto.extension,
      introduction: dto.introduction,
      contractDate: dto.contractDate,
      contractTerm: dto.contractTerm,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
      bankName: dto.bankName,
      active: dto.active ?? true,
      status: dto.status ?? CooperationStatus.PENDING,
      commissionType: dto.commissionType,
      commissionValue: dto.commissionValue,
      taxId: dto.taxId,
      representativeName: dto.representativeName,
      representativePhone: dto.representativePhone,
      representativeEmail: dto.representativeEmail,
      currentContractUrl: dto.currentContractUrl,
      bookingTimes: 0,
      revenue: '0.00',
      averageRating: '0.00',
    });

    if (dto.userId) {
      const manager = await this.userRepo.findOne({
        where: { id: dto.userId },
      });
      if (!manager) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }
      cooperation.manager = manager;
    }

    return this.cooperationRepo.save(cooperation);
  }

  async findAll(
    params: {
      q?: string;
      type?: string;
      city?: string;
      province?: string;
      active?: boolean;
      status?: CooperationStatus;
    } = {},
  ): Promise<Cooperation[]> {
    const { q, type, city, province, active, status } = params;
    const qb = this.cooperationRepo
      .createQueryBuilder('cooperation')
      .leftJoinAndSelect('cooperation.manager', 'manager');

    if (q) {
      qb.andWhere('(cooperation.name ILIKE :q OR cooperation.code ILIKE :q)', { q: `%${q}%` });
    }

    if (type) {
      qb.andWhere('cooperation.type = :type', { type });
    }

    if (city) {
      qb.andWhere('cooperation.city = :city', { city });
    }

    if (province) {
      qb.andWhere('cooperation.province = :province', { province });
    }

    if (typeof active === 'boolean') {
      qb.andWhere('cooperation.active = :active', { active });
    }

    if (status) {
      qb.andWhere('cooperation.status = :status', { status });
    }

    return qb.orderBy('cooperation.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Cooperation> {
    const cooperation = await this.cooperationRepo.findOne({
      where: { id },
      relations: { manager: true, rooms: true },
    });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${id} not found`);
    }
    return cooperation;
  }

  async update(id: number, dto: UpdateCooperationDto): Promise<Cooperation> {
    const cooperation = await this.findOne(id);

    assignDefined(cooperation, {
      name: dto.name,
      type: dto.type,
      code: dto.code,
      numberOfObjects: dto.numberOfObjects,
      numberOfObjectTypes: dto.numberOfObjectTypes,
      bossName: dto.bossName,
      bossPhone: dto.bossPhone,
      bossEmail: dto.bossEmail,
      address: dto.address,
      district: dto.district,
      city: dto.city,
      province: dto.province,
      photo: dto.photo,
      extension: dto.extension,
      introduction: dto.introduction,
      contractTerm: dto.contractTerm,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
      bankName: dto.bankName,
      active: dto.active,
      status: dto.status,
      commissionType: dto.commissionType,
      commissionValue: dto.commissionValue,
      taxId: dto.taxId,
      representativeName: dto.representativeName,
      representativePhone: dto.representativePhone,
      representativeEmail: dto.representativeEmail,
      currentContractUrl: dto.currentContractUrl,
    });

    if (dto.contractDate !== undefined) {
      cooperation.contractDate = dto.contractDate;
    }

    if (dto.userId !== undefined) {
      if (dto.userId === null) {
        cooperation.manager = undefined;
      } else {
        const manager = await this.userRepo.findOne({
          where: { id: dto.userId },
        });
        if (!manager) {
          throw new NotFoundException(`User ${dto.userId} not found`);
        }
        cooperation.manager = manager;
      }
    }

    return this.cooperationRepo.save(cooperation);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const cooperation = await this.findOne(id);
    await this.cooperationRepo.remove(cooperation);
    return { id, message: 'Cooperation removed' };
  }

  async adjustBookingMetrics(
    id: number,
    bookingDelta: number,
    revenueDelta = 0,
  ): Promise<void> {
    const cooperation = await this.cooperationRepo.findOne({ where: { id } });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${id} not found`);
    }
    cooperation.bookingTimes += bookingDelta;
    const currentRevenue = Number(cooperation.revenue ?? 0);
    const updatedRevenue = currentRevenue + revenueDelta;
    cooperation.revenue = this.formatMoney(updatedRevenue);
    await this.cooperationRepo.save(cooperation);
  }

  async findFavoritesByUser(userId: number): Promise<Cooperation[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favoriteCooperationIds?.length) {
      return [];
    }

    const ids = user.favoriteCooperationIds
      .map((rawId) => Number(rawId))
      .filter((value) => !Number.isNaN(value) && Number.isInteger(value));

    if (!ids.length) {
      return [];
    }

    const cooperations = await this.cooperationRepo.find({
      where: { id: In(ids) },
      relations: {
        manager: true,
        rooms: true,
        deliveryVehicles: true,
        restaurantTables: true,
        busTypes: true,
        trainRoutes: true,
        flights: true,
      },
    });

    const order = new Map(ids.map((value, index) => [value, index]));
    return cooperations.sort((a, b) => {
      const left = order.get(a.id) ?? 0;
      const right = order.get(b.id) ?? 0;
      return left - right;
    });
  }

  async favorite(cooperationId: number, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const cooperation = await this.cooperationRepo.findOne({ where: { id: cooperationId } });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${cooperationId} not found`);
    }

    const current = user.favoriteCooperationIds ?? [];
    if (!current.includes(cooperationId.toString())) {
      user.favoriteCooperationIds = [...current, cooperationId.toString()];
      await this.userRepo.save(user);
    }
  }

  async unfavorite(cooperationId: number, userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const current = user.favoriteCooperationIds ?? [];
    if (current.includes(cooperationId.toString())) {
      user.favoriteCooperationIds = current.filter((id) => id !== cooperationId.toString());
      await this.userRepo.save(user);
    }
  }

  async register(dto: RegisterCooperationDto, userId: number): Promise<Cooperation> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const cooperation = this.cooperationRepo.create({
      ...dto,
      manager: user,
      status: CooperationStatus.PENDING,
      active: true, // legacy compatibility
    });

    return this.cooperationRepo.save(cooperation);
  }

  async approve(id: number, dto: ApproveCooperationDto): Promise<Cooperation> {
    const cooperation = await this.findOne(id);
    cooperation.status = CooperationStatus.APPROVED;
    cooperation.commissionType = dto.commissionType;
    cooperation.commissionValue = dto.commissionValue;
    return this.cooperationRepo.save(cooperation);
  }

  async addContract(
    id: number,
    contractUrl: string,
    dto: Omit<UploadContractDto, 'file'>,
  ): Promise<CooperationContract> {
    const cooperation = await this.findOne(id);
    
    // Create new contract record
    const contract = this.contractRepo.create({
      cooperationId: id,
      contractUrl,
      signedDate: dto.signedDate,
      expiryDate: dto.expiryDate,
      terms: dto.terms,
      active: true,
    });

    const savedContract = await this.contractRepo.save(contract);

    // Update cooperation status to ACTIVE
    cooperation.status = CooperationStatus.ACTIVE;
    cooperation.currentContractUrl = contractUrl;
    await this.cooperationRepo.save(cooperation);

    return savedContract;
  }

  async findAllContracts() {
    return this.contractRepo.find({
      relations: ['cooperation'],
      order: { signedDate: 'DESC' },
    });
  }
}
