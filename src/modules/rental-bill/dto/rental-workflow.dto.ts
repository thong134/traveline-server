import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class DeliveryActionDto {
  @ApiProperty({ description: 'Danh sách ảnh bàn giao xe' })
  @IsArray()
  @IsString({ each: true })
  photos: string[];
}

export class PickupActionDto {
  @ApiProperty({ description: 'Ảnh selfie xác thực nhận xe' })
  @IsString()
  selfiePhoto: string;
}

export class ReturnRequestDto {
  @ApiProperty({ description: 'Danh sách ảnh tình trạng xe khi trả' })
  @IsArray()
  @IsString({ each: true })
  photos: string[];

  @ApiProperty({ description: 'Vĩ độ vị trí trả xe' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ vị trí trả xe' })
  @IsNumber()
  longitude: number;
}

export class ConfirmReturnDto {
  @ApiProperty({ description: 'Danh sách ảnh tình trạng xe khi nhận lại' })
  @IsArray()
  @IsString({ each: true })
  photos: string[];

  @ApiProperty({ description: 'Vĩ độ vị trí nhận lại xe' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ vị trí nhận lại xe' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Xác nhận thu thêm phí quá hạn (nếu có)' })
  @IsBoolean()
  @IsOptional()
  overtimeFeeAccepted?: boolean;
}
