import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserTier } from './entities/user-tier.enum';
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

  private static tierThresholds: Array<{ min: number; tier: UserTier }> = [
    { min: 1000000, tier: UserTier.LEGENDARY_TRAVELER },
    { min: 300000, tier: UserTier.ELITE_VOYAGER },
    { min: 150000, tier: UserTier.TRAVEL_EXPERT },
    { min: 50000, tier: UserTier.JOURNEY_MASTER },
    { min: 20000, tier: UserTier.TRAVEL_ENTHUSIAST },
    { min: 5000, tier: UserTier.ACTIVE_TRAVELER },
    { min: 0, tier: UserTier.EXPLORER },
  ];

  static resolveTier(exp: number): UserTier {
    for (const entry of UsersService.tierThresholds) {
      if (exp >= entry.min) {
        return entry.tier;
      }
    }
    return UserTier.EXPLORER;
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

  async markEmailVerified(userId: number, email?: string): Promise<void> {
    const payload: Partial<User> = { isEmailVerified: true };
    if (email) {
      payload.email = email;
    }
    await this.usersRepository.update({ id: userId }, payload);
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

  async markCitizenIdVerified(userId: number): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { isCitizenIdVerified: true },
    );
  }

  async updateInitialProfile(
    userId: number,
    data: {
      fullName?: string;
      gender?: string;
      address?: string;
      nationality?: string;
      dateOfBirth?: string | Date | null;
    },
  ): Promise<User> {
    const user = await this.findOne(userId);
    if (data.dateOfBirth !== undefined) {
      user.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    assignDefined(user, {
      fullName: data.fullName,
      gender: data.gender,
      address: data.address,
      nationality: data.nationality,
    });
    return this.usersRepository.save(user);
  }

  async updateVerificationInfo(
    userId: number,
    data: {
      email?: string;
      phone?: string;
      citizenId?: string;
    },
  ): Promise<User> {
    const user = await this.findOne(userId);

    if (data.email && data.email !== user.email) {
      user.email = data.email;
      user.isEmailVerified = false;
    }
    if (data.phone && data.phone !== user.phone) {
      user.phone = data.phone;
      user.isPhoneVerified = false;
    }
    if (data.citizenId && data.citizenId !== user.citizenId) {
      user.citizenId = data.citizenId;
      user.isCitizenIdVerified = false;
    }

    return this.usersRepository.save(user);
  }

  async updateHobbies(userId: number, hobbies: string[]): Promise<User> {
    const user = await this.findOne(userId);
    user.hobbies = hobbies;
    return this.usersRepository.save(user);
  }

  async updateAvatarUrl(userId: number, avatarUrl: string): Promise<User> {
    const user = await this.findOne(userId);
    user.avatarUrl = avatarUrl;
    return this.usersRepository.save(user);
  }

  async deleteAvatarUrl(userId: number): Promise<User> {
    const user = await this.findOne(userId);
    user.avatarUrl = null;
    return this.usersRepository.save(user);
  }

  async updateProfile(userId: number, data: ProfileUpdateInput): Promise<User> {
    const user = await this.findOne(userId);

    if (data.dateOfBirth !== undefined) {
      user.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
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
    return this.updateFavoriteList(
      userId,
      'cooperationIds',
      cooperationId,
      true,
    );
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
    dto: any,
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
