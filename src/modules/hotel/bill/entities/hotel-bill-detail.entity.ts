import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HotelBill } from './hotel-bill.entity';
import { HotelRoom } from '../../room/entities/hotel-room.entity';

@Entity('hotel_bill_details')
export class HotelBillDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HotelBill, (bill: HotelBill) => bill.details, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bill_id' })
  bill: HotelBill;

  @Column({ name: 'bill_id' })
  billId: number;

  @ManyToOne(() => HotelRoom, (room: HotelRoom) => room.billDetails, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  room: HotelRoom;

  @Column({ name: 'room_id' })
  roomId: number;

  @Column()
  roomName: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', default: 1 })
  nights: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  pricePerNight: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total: string;
}
