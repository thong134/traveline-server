import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ManageRentalBillVehicleDto {
  @ApiProperty({ description: 'Biển số xe', example: '47L7-7886' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;
}
