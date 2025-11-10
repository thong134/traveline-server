import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentalContract, RentalContractStatus } from './rental-contract.entity';
import { CreateRentalContractDto } from './dto/create-rental-contract.dto';
import { UpdateRentalContractDto } from './dto/update-rental-contract.dto';
import { User } from '../users/entities/user.entity';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class RentalContractsService {
  constructor(
    @InjectRepository(RentalContract)
    private readonly repo: Repository<RentalContract>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateRentalContractDto): Promise<RentalContract> {
    if (!dto.termsAccepted) {
      throw new BadRequestException(
        'termsAccepted must be true to register a rental contract',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const contract = this.repo.create({
      ...dto,
      businessType: dto.businessType,
      status: RentalContractStatus.PENDING,
      statusUpdatedAt: new Date(),
      totalVehicles: 0,
      totalRentalTimes: 0,
      averageRating: '0.00',
    });

    return this.repo.save(contract);
  }

  async findAll(
    params: { userId?: number; status?: RentalContractStatus } = {},
  ): Promise<RentalContract[]> {
    const { userId, status } = params;
    const qb = this.repo.createQueryBuilder('contract');

    if (userId) {
      qb.andWhere('contract.userId = :userId', { userId });
    }

    if (status) {
      qb.andWhere('contract.status = :status', { status });
    }

    return qb
      .leftJoinAndSelect('contract.vehicles', 'vehicles')
      .leftJoinAndSelect('contract.user', 'user')
      .orderBy('contract.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<RentalContract> {
    const contract = await this.repo.findOne({
      where: { id },
      relations: ['vehicles', 'user'],
    });
    if (!contract) {
      throw new NotFoundException(`Rental contract ${id} not found`);
    }
    return contract;
  }

  async update(
    id: number,
    dto: UpdateRentalContractDto,
  ): Promise<RentalContract> {
    const contract = await this.findOne(id);

    assignDefined(contract, {
      citizenId: dto.citizenId,
      businessType: dto.businessType,
      businessName: dto.businessName,
      businessProvince: dto.businessProvince,
      businessAddress: dto.businessAddress,
      taxCode: dto.taxCode,
      businessRegisterPhoto: dto.businessRegisterPhoto,
      citizenFrontPhoto: dto.citizenFrontPhoto,
      citizenBackPhoto: dto.citizenBackPhoto,
      contractTerm: dto.contractTerm,
      notes: dto.notes,
      bankName: dto.bankName,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
      termsAccepted: dto.termsAccepted,
    });

    if (dto.status && dto.status !== contract.status) {
      contract.status = dto.status;
      contract.statusUpdatedAt = new Date();
      if (
        dto.status === RentalContractStatus.APPROVED &&
        dto.rejectedReason === undefined
      ) {
        contract.rejectedReason = undefined;
      }
    } else if (dto.status) {
      contract.status = dto.status;
    }

    if (dto.rejectedReason !== undefined) {
      contract.rejectedReason = dto.rejectedReason;
    }

    return this.repo.save(contract);
  }

  async remove(id: number): Promise<void> {
    const contract = await this.findOne(id);
    await this.repo.remove(contract);
  }

  async incrementVehicleCounter(
    contractId: number,
    delta: number,
  ): Promise<void> {
    await this.repo.increment({ id: contractId }, 'totalVehicles', delta);
  }

  async adjustRentalMetrics(
    contractId: number,
    rentalsDelta: number,
    ratingDelta?: number,
  ): Promise<void> {
    await this.repo.increment(
      { id: contractId },
      'totalRentalTimes',
      rentalsDelta,
    );

    if (typeof ratingDelta === 'number') {
      const contract = await this.repo.findOne({ where: { id: contractId } });
      if (contract) {
        const totalRatings =
          Number(contract.averageRating) *
          Math.max(contract.totalRentalTimes, 1);
        const newAverage =
          (totalRatings + ratingDelta) / Math.max(contract.totalRentalTimes, 1);
        contract.averageRating = newAverage.toFixed(2);
        await this.repo.save(contract);
      }
    }
  }
}
