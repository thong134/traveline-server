import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestinationBill, DestinationBillStatus } from './entities/destination-bill.entity';
import { CreateDestinationBillDto } from './dto/create-destination-bill.dto';
import { Destination } from '../destination/entities/destinations.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class DestinationBillService {
  constructor(
    @InjectRepository(DestinationBill)
    private readonly billRepo: Repository<DestinationBill>,
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateDestinationBillDto, userId: number): Promise<DestinationBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const destination = await this.destinationRepo.findOne({ where: { id: dto.destinationId } });
    if (!destination) throw new NotFoundException(`Destination ${dto.destinationId} not found`);

    if (!destination.hasTourTickets) {
      throw new BadRequestException(`Destination ${destination.name} does not sell tickets.`);
    }

    // Parse price from destination (Assuming ticketPrice is added or parsed from range)
    // For now, I will assume we added a ticketPrice column to Destination, or use a default/parsed value.
    // Let's assume we add 'ticketPrice' to Destination entity in the next step.
    const pricePerTicket = destination.ticketPrice || 0; 
    
    if (pricePerTicket <= 0) {
       throw new BadRequestException(`Ticket price for ${destination.name} is invalid.`);
    }

    const totalAmount = pricePerTicket * dto.ticketQuantity;
    const code = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const bill = this.billRepo.create({
      code,
      user,
      destination,
      ticketQuantity: dto.ticketQuantity,
      pricePerTicket: pricePerTicket.toString(),
      totalAmount: totalAmount.toString(),
      status: DestinationBillStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      contactName: dto.contactName || user.fullName,
      contactPhone: dto.contactPhone || user.phone,
      contactEmail: dto.contactEmail || user.email,
      visitDate: dto.visitDate,
    });

    return this.billRepo.save(bill);
  }

  async findAllByUser(userId: number) {
    return this.billRepo.find({
      where: { userId },
      relations: ['destination'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number) {
    const bill = await this.billRepo.findOne({
      where: { id, userId },
      relations: ['destination'],
    });
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    return bill;
  }
}
