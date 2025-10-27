import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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
    await this.usersRepository.update({ id: userId }, { password: hashedPassword });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async markPhoneVerified(userId: number): Promise<void> {
    await this.usersRepository.update({ id: userId }, { isPhoneVerified: true });
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

  private prepareUserPayload(dto: CreateUserDto | UpdateUserDto): Partial<User> {
    const { dateOfBirth, ...rest } = dto;
    const payload: Partial<User> = {};

    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined) {
        (payload as Record<string, unknown>)[key] = value;
      }
    });

    if (dateOfBirth !== undefined) {
      payload.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    return payload;
  }
}
