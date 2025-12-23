import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { TransformDDMMYYYYHHmm } from '../../../common/utils/date.util';

export class AddMaintenanceDto {
  @ApiProperty({ description: 'Biển số xe', example: '59A-123.45' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({ description: 'Ngày bắt đầu bảo trì (dd/MM/yyyy HH:mm)', example: '25/12/2024 08:00' })
  @TransformDDMMYYYYHHmm()
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ description: 'Ngày kết thúc bảo trì (dd/MM/yyyy HH:mm)', example: '26/12/2024 17:00' })
  @TransformDDMMYYYYHHmm()
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({ description: 'Lý do bảo trì', example: 'Thay nhớt, kiểm tra định kỳ' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
