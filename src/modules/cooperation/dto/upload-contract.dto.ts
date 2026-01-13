import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString } from 'class-validator';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';

export class UploadContractDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File hợp đồng (PDF/Image)',
  })
  file: any;

  @ApiPropertyOptional({
    description: 'Ngày ký hợp đồng (dd/MM/yyyy)',
    example: '13/04/2004',
  })
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  signedDate?: Date;

  @ApiPropertyOptional({
    description: 'Ngày hết hạn hợp đồng (dd/MM/yyyy)',
    example: '13/04/2025',
  })
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  expiryDate?: Date;

  @ApiPropertyOptional({ description: 'Các điều khoản bổ sung' })
  @IsOptional()
  @IsString()
  terms?: string;
}
