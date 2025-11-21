import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { assignDefined } from '../../common/utils/object.util';

export type ProfileUpdateInput = {
  fullName?: string;
  dateOfBirth?: string | Date | null;
  gender?: string;
  address?: string;
  nationality?: string;
  citizenId?: string;
  idCardImageUrl?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  avatarUrl?: string | null;
};

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private static tierThresholds: Array<{ min: number; tier: string }> = [
    { min: 10000, tier: 'kim_cuong' },
    { min: 5000, tier: 'vang' },
    { min: 2000, tier: 'bac' },
    { min: 0, tier: 'dong' },
  ];

  static resolveTier(exp: number): string {
    for (const entry of UsersService.tierThresholds) {
      if (exp >= entry.min) {
        return entry.tier;
      }
    }
    return 'dong';
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const payload = this.prepareUserPayload(createUserDto);
    const user = this.usersRepository.create(payload);
    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { password: hashedPassword },
    );
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async markPhoneVerified(userId: number): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { isPhoneVerified: true },
    );
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const payload = this.prepareUserPayload(updateUserDto);
    await this.usersRepository.update(id, payload);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { id, message: 'User deleted' };
  }

  async updateProfile(
    userId: number,
    data: ProfileUpdateInput,
  ): Promise<User> {
    const user = await this.findOne(userId);

    if (data.dateOfBirth !== undefined) {
      user.dateOfBirth = data.dateOfBirth
        ? new Date(data.dateOfBirth)
        : null;
    }

    assignDefined(user, {
      fullName: data.fullName,
      gender: data.gender,
      address: data.address,
      nationality: data.nationality,
      citizenId: data.citizenId,
      idCardImageUrl: data.idCardImageUrl,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
    });

    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl ?? null;
    }

    return this.usersRepository.save(user);
  }

  async addFavoriteEatery(userId: number, eateryId: number): Promise<string[]> {
    return this.updateFavoriteList(userId, 'favoriteEateries', eateryId, true);
  }

  async removeFavoriteEatery(
    userId: number,
    eateryId: number,
  ): Promise<string[]> {
    return this.updateFavoriteList(userId, 'favoriteEateries', eateryId, false);
  }

  async addFavoriteCooperation(
    userId: number,
    cooperationId: number,
  ): Promise<string[]> {
    return this.updateFavoriteList(userId, 'cooperationIds', cooperationId, true);
  }

  async removeFavoriteCooperation(
    userId: number,
    cooperationId: number,
  ): Promise<string[]> {
    return this.updateFavoriteList(
      userId,
      'cooperationIds',
      cooperationId,
      false,
    );
  }

  private async updateFavoriteList(
    userId: number,
    field: 'favoriteEateries' | 'cooperationIds',
    entityId: number,
    add: boolean,
  ): Promise<string[]> {
    const user = await this.findOne(userId);
    const current = Array.isArray(user[field]) ? [...user[field]] : [];
    const candidate = String(entityId);

    if (add) {
      if (!current.includes(candidate)) {
        current.push(candidate);
      }
    } else {
      const idx = current.indexOf(candidate);
      if (idx === -1) {
        return current;
      }
      current.splice(idx, 1);
    }

    await this.usersRepository.update(userId, {
      [field]: current,
    } as Partial<User>);

    return current;
  }

  private prepareUserPayload(
    dto: CreateUserDto | UpdateUserDto,
  ): Partial<User> {
    const { dateOfBirth, ...rest } = dto;
    const payload: Partial<User> = {};
    const arrayFields = new Set([
      'hobbies',
      'favoriteDestinationIds',
      'favoriteEateries',
      'cooperationIds',
    ]);
    const numericFields = new Set([
      'travelPoint',
      'travelExp',
      'travelTrip',
      'feedbackTimes',
      'dayParticipation',
    ]);

    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined) return;

      if (arrayFields.has(key)) {
        const arr = Array.isArray(value)
          ? value.filter((item) => typeof item === 'string')
          : [];
        (payload as Record<string, unknown>)[key] = arr;
        return;
      }

      if (numericFields.has(key)) {
        const parsed = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(parsed)) return;
        (payload as Record<string, unknown>)[key] = parsed;
        return;
      }

      (payload as Record<string, unknown>)[key] = value;
    });

    if (dateOfBirth !== undefined) {
      payload.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    if (payload.travelExp !== undefined) {
      payload.userTier = UsersService.resolveTier(payload.travelExp);
    }

    return payload;
  }
}
