import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DeliveryActionDto {
  @ApiProperty({ description: 'Danh sách ảnh bàn giao xe' })
  @IsOptional()
  photos: string[];
}

export class PickupActionDto {
  @ApiProperty({ description: 'Ảnh selfie xác thực nhận xe' })
  @IsOptional()
  selfiePhoto: string;
}

export class ReturnRequestDto {
  @ApiProperty({ description: 'Danh sách ảnh tình trạng xe khi trả' })
  @IsOptional()
  photos: string[];

  @ApiProperty({ description: 'Vĩ độ vị trí trả xe' })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: 'Kinh độ vị trí trả xe' })
  @IsNumber()
  @Type(() => Number)
  longitude: number;
}

export class ConfirmReturnDto {
  @ApiProperty({ description: 'Danh sách ảnh tình trạng xe khi nhận lại' })
  @IsOptional()
  photos: string[];

  @ApiProperty({ description: 'Vĩ độ vị trí nhận lại xe' })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: 'Kinh độ vị trí nhận lại xe' })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiProperty({ description: 'Xác nhận thu thêm phí quá hạn (nếu có)' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  overtimeFeeAccepted?: boolean;
}
