import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentalContract,
  RentalContractStatus,
} from './entities/rental-contract.entity';
import { CreateRentalContractDto } from './dto/create-rental-contract.dto';
import { UpdateRentalContractDto } from './dto/update-rental-contract.dto';
import {
  RenewRentalContractDto,
  RejectRentalContractDto,
  UpdateRentalContractStatusDto,
} from './dto/manage-rental-contract.dto';
import { User } from '../user/entities/user.entity';
import { assignDefined } from '../../common/utils/object.util';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import type { Express } from 'express';
import { assertImageFile } from '../../common/upload/image-upload.utils';

type ContractImageFiles = {
  businessRegisterPhoto?: Express.Multer.File;
  citizenFrontPhoto?: Express.Multer.File;
  citizenBackPhoto?: Express.Multer.File;
};

@Injectable()
export class RentalContractsService {
  constructor(
    @InjectRepository(RentalContract)
    private readonly repo: Repository<RentalContract>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async getContractOrFail(id: number): Promise<RentalContract> {
    const contract = await this.repo.findOne({
      where: { id },
      relations: ['vehicles', 'user'],
    });
    if (!contract) {
      throw new NotFoundException(`Rental contract ${id} not found`);
    }
    return contract;
  }

  async create(
    userId: number,
    dto: CreateRentalContractDto,
    files: ContractImageFiles = {},
  ): Promise<RentalContract> {
    if (!dto.termsAccepted) {
      throw new BadRequestException(
        'termsAccepted must be true to register a rental contract',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const contract = this.repo.create({
      ...dto,
      user,
      userId: user.id,
      businessType: dto.businessType,
      status: RentalContractStatus.PENDING,
      statusUpdatedAt: new Date(),
      totalVehicles: 0,
      totalRentalTimes: 0,
      averageRating: '0.00',
    });

    const saved = await this.repo.save(contract);

    const updated = await this.applyContractImages(saved, files);
    if (updated) {
      return this.repo.save(saved);
    }

    return saved;
  }

  async findAll(
    userId: number,
    params: { status?: RentalContractStatus } = {},
  ): Promise<RentalContract[]> {
    const { status } = params;
    const qb = this.repo.createQueryBuilder('contract');

    qb.andWhere('contract.userId = :userId', { userId });

    if (status) {
      qb.andWhere('contract.status = :status', { status });
    }

    return qb
      .leftJoinAndSelect('contract.vehicles', 'vehicles')
      .leftJoinAndSelect('contract.user', 'user')
      .orderBy('contract.createdAt', 'DESC')
      .getMany();
  }

  async findAllForAdmin(
    params: { status?: RentalContractStatus } = {},
  ): Promise<RentalContract[]> {
    const { status } = params;
    const qb = this.repo.createQueryBuilder('contract');

    if (status) {
      qb.andWhere('contract.status = :status', { status });
    }

    return qb
      .leftJoinAndSelect('contract.vehicles', 'vehicles')
      .leftJoinAndSelect('contract.user', 'user')
      .orderBy('contract.createdAt', 'DESC')
      .getMany();
  }

  async findOne(
    id: number,
    userId: number,
    options: { asAdmin?: boolean } = {},
  ): Promise<RentalContract> {
    const contract = await this.getContractOrFail(id);
    if (!options.asAdmin && contract.userId !== userId) {
      throw new ForbiddenException('You do not have access to this contract');
    }
    return contract;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateRentalContractDto,
    files: ContractImageFiles = {},
  ): Promise<RentalContract> {
    const contract = await this.findOne(id, userId);

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

    if (dto.status) {
      this.applyStatusUpdate(contract, dto.status, {
        rejectedReason: dto.rejectedReason,
      });
    } else if (dto.rejectedReason !== undefined) {
      contract.rejectedReason = dto.rejectedReason;
    }

    const updated = await this.applyContractImages(contract, files);

    return this.repo.save(contract);
  }

  async updateStatus(
    id: number,
    userId: number,
    dto: UpdateRentalContractStatusDto,
  ): Promise<RentalContract> {
    const contract = await this.findOne(id, userId);
    this.applyStatusUpdate(contract, dto.status, {
      rejectedReason: dto.rejectedReason,
    });
    return this.repo.save(contract);
  }

  async approve(id: number): Promise<RentalContract> {
    const contract = await this.getContractOrFail(id);
    this.applyStatusUpdate(contract, RentalContractStatus.APPROVED);
    return this.repo.save(contract);
  }

  async reject(
    id: number,
    dto: RejectRentalContractDto,
  ): Promise<RentalContract> {
    const contract = await this.getContractOrFail(id);
    this.applyStatusUpdate(contract, RentalContractStatus.REJECTED, {
      rejectedReason: dto.rejectedReason,
    });
    return this.repo.save(contract);
  }

  async renew(
    id: number,
    userId: number,
    dto: RenewRentalContractDto,
  ): Promise<RentalContract> {
    const contract = await this.findOne(id, userId);
    if (contract.status !== RentalContractStatus.SUSPENDED) {
      throw new BadRequestException(
        'Contract must be suspended before it can be renewed',
      );
    }

    assignDefined(contract, {
      contractTerm: dto.contractTerm,
      notes: dto.notes,
    });

    this.applyStatusUpdate(contract, RentalContractStatus.APPROVED);
    return this.repo.save(contract);
  }

  async remove(id: number, userId: number): Promise<void> {
    const contract = await this.findOne(id, userId);
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

  private applyStatusUpdate(
    contract: RentalContract,
    status: RentalContractStatus,
    options: { rejectedReason?: string } = {},
  ): void {
    if (status === RentalContractStatus.REJECTED && !options.rejectedReason) {
      throw new BadRequestException('Rejected contracts require a reason');
    }

    const statusChanged = contract.status !== status;
    contract.status = status;
    if (statusChanged) {
      contract.statusUpdatedAt = new Date();
    }

    if (status === RentalContractStatus.APPROVED) {
      contract.rejectedReason = undefined;
    } else if (options.rejectedReason !== undefined) {
      contract.rejectedReason = options.rejectedReason;
    }
  }

  private async applyContractImages(
    contract: RentalContract,
    files: ContractImageFiles,
  ): Promise<boolean> {
    let hasChanges = false;

    const mappings: Array<{
      key: keyof ContractImageFiles & keyof RentalContract;
      file?: Express.Multer.File;
      label: string;
    }> = [
      {
        key: 'businessRegisterPhoto',
        file: files.businessRegisterPhoto,
        label: 'business-register',
      },
      {
        key: 'citizenFrontPhoto',
        file: files.citizenFrontPhoto,
        label: 'citizen-front',
      },
      {
        key: 'citizenBackPhoto',
        file: files.citizenBackPhoto,
        label: 'citizen-back',
      },
    ];

    for (const mapping of mappings) {
      if (!mapping.file) {
        continue;
      }

      assertImageFile(mapping.file, { fieldName: mapping.key });
      const upload = await this.cloudinaryService.uploadImage(mapping.file, {
        folder: `traveline/rental-contracts/${contract.userId}`,
        publicId: contract.id
          ? `${contract.id}_${mapping.label}`
          : undefined,
      });
      (contract as unknown as Record<string, unknown>)[mapping.key] = upload.url;
      hasChanges = true;
    }

    return hasChanges;
  }
}
