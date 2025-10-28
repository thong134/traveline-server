import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cooperation } from '../cooperations/cooperation.entity';
import { DeliveryBill } from './delivery-bill.entity';

@Entity('delivery_vehicles')
export class DeliveryVehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  typeName: string;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.deliveryVehicles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column({ nullable: true })
  sizeLimit?: string;

  @Column({ nullable: true })
  weightLimit?: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'price_less_than_10km',
  })
  priceLessThan10Km?: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'price_more_than_10km',
  })
  priceMoreThan10Km?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @OneToMany(() => DeliveryBill, (bill) => bill.vehicle)
  bills: DeliveryBill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
