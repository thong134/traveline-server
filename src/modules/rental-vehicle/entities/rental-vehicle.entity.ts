import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RentalContract } from '../../rental-contract/entities/rental-contract.entity';
import { VehicleCatalog } from '../../vehicle-catalog/entities/vehicle-catalog.entity';
import { RentalBillDetail } from '../../rental-bill/entities/rental-bill-detail.entity';

import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
  RentalVehicleType,
} from '../enums/rental-vehicle.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('rental_vehicles')
export class RentalVehicle {
  @ApiProperty({ description: 'Biển số xe' })
  @PrimaryColumn({ length: 32 })
  licensePlate: string;

  @ManyToOne(
    () => RentalContract,
    (contract: RentalContract) => contract.vehicles,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'contractId' })
  contract: RentalContract;

  @ApiProperty()
  @Column()
  contractId: number;

  @ApiPropertyOptional({ type: () => VehicleCatalog })
  @ManyToOne(() => VehicleCatalog, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'vehicleCatalogId' })
  vehicleCatalog?: VehicleCatalog;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  vehicleCatalogId?: number;

  @ApiProperty({ enum: RentalVehicleType })
  @Column({
    type: 'enum',
    enum: RentalVehicleType,
    default: RentalVehicleType.BIKE,
  })
  vehicleType: RentalVehicleType;

  // Base prices (required)
  @ApiProperty({ description: 'Giá thuê theo giờ' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerHour: string;

  @ApiProperty({ description: 'Giá thuê theo ngày' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerDay: string;

  // Hourly packages (optional)
  @ApiPropertyOptional({ description: 'Giá thuê gói 4 giờ' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor4Hours?: string;

  @ApiPropertyOptional({ description: 'Giá thuê gói 8 giờ' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor8Hours?: string;

  @ApiPropertyOptional({ description: 'Giá thuê gói 12 giờ' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor12Hours?: string;

  // Daily packages (optional)
  @ApiPropertyOptional({ description: 'Giá thuê gói 2 ngày' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor2Days?: string;

  @ApiPropertyOptional({ description: 'Giá thuê gói 3 ngày' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor3Days?: string;

  @ApiPropertyOptional({ description: 'Giá thuê gói 5 ngày' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor5Days?: string;

  @ApiPropertyOptional({ description: 'Giá thuê gói 7 ngày' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor7Days?: string;

  @ApiPropertyOptional({ description: 'Yêu cầu đối với người thuê' })
  @Column({ nullable: true })
  requirements?: string;

  @ApiPropertyOptional({ description: 'Mô tả thêm về xe' })
  @Column({ nullable: true })
  description?: string;

  @ApiPropertyOptional({ description: 'Ảnh mặt trước đăng ký xe' })
  @Column({ nullable: true })
  vehicleRegistrationFront?: string;

  @ApiPropertyOptional({ description: 'Ảnh mặt sau đăng ký xe' })
  @Column({ nullable: true })
  vehicleRegistrationBack?: string;

  @ApiProperty({ enum: RentalVehicleApprovalStatus })
  @Column({
    type: 'enum',
    enum: RentalVehicleApprovalStatus,
    default: RentalVehicleApprovalStatus.PENDING,
  })
  status: RentalVehicleApprovalStatus;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  rejectedReason?: string;

  @ApiProperty({ enum: RentalVehicleAvailabilityStatus })
  @Column({
    type: 'enum',
    enum: RentalVehicleAvailabilityStatus,
    default: RentalVehicleAvailabilityStatus.UNAVAILABLE,
  })
  availability: RentalVehicleAvailabilityStatus;

  @ApiProperty({ description: 'Tổng số lượt thuê' })
  @Column({ type: 'int', default: 0 })
  totalRentals: number;

  @ApiProperty({ description: 'Đánh giá trung bình' })
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  averageRating: string;

  @OneToMany(
    () => RentalBillDetail,
    (detail: RentalBillDetail) => detail.vehicle,
  )
  billDetails: RentalBillDetail[];

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Virtual fields for search results documentation
  @ApiPropertyOptional({ description: 'Khoảng cách di chuyển đường bộ (km)' })
  distance?: number;

  @ApiPropertyOptional({ description: 'Phí vận chuyển dự kiến' })
  shippingFee?: number;

  @ApiPropertyOptional({ description: 'Phí vận chuyển có thể thương lượng' })
  isShippingFeeNegotiable?: boolean;
}
