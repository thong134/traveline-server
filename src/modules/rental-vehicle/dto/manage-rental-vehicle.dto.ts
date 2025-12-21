import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectRentalVehicleDto {
  @ApiProperty({ description: 'Lý do từ chối xe cho thuê' })
  @IsString()
  @IsNotEmpty()
  rejectedReason: string;
}
