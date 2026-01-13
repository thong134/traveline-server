import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegisterCooperationDto {
  // SECTION 1: Basic Info
  @ApiProperty({ description: 'Tên đơn vị hợp tác' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description:
      'Loại hình (hotel, restaurant, tour, transportation, delivery...)',
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Địa chỉ chi tiết' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Tên Tỉnh/Thành' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Tên Quận/Huyện' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'ID Tỉnh/Thành' })
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiPropertyOptional({ description: 'ID Quận/Huyện' })
  @IsOptional()
  @IsString()
  districtId?: string;

  @ApiPropertyOptional({ description: 'Mã Phường/Xã' })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiPropertyOptional({ description: 'Giới thiệu ngắn' })
  @IsOptional()
  @IsString()
  introduction?: string;

  @ApiPropertyOptional({ description: 'Logo thương hiệu (URL)' })
  @IsOptional()
  @IsString()
  brandLogo?: string;

  // SECTION 1 & 2: Representative Info
  @ApiPropertyOptional({ description: 'Tên người đại diện' })
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional({ description: 'SĐT người đại diện' })
  @IsOptional()
  @IsString()
  representativePhone?: string;

  @ApiPropertyOptional({ description: 'Email người đại diện' })
  @IsOptional()
  @IsEmail()
  representativeEmail?: string;

  // SECTION 2: Legal & Payment
  @ApiPropertyOptional({ description: 'Giấy phép kinh doanh (URL)' })
  @IsOptional()
  @IsString()
  businessLicense?: string;

  @ApiPropertyOptional({ description: 'CCCD người đại diện (URL)' })
  @IsOptional()
  @IsString()
  representativeIdCard?: string;

  @ApiPropertyOptional({ description: 'Mã số thuế' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Số tài khoản ngân hàng' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Tên chủ tài khoản' })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiPropertyOptional({ description: 'Tên ngân hàng' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Mã QR thanh toán (URL)' })
  @IsOptional()
  @IsString()
  paymentQr?: string;

  // SECTION 3: Service Config
  @ApiPropertyOptional({ description: 'Dữ liệu dịch vụ động (JSON)' })
  @IsOptional()
  @IsObject()
  serviceData?: any;

  @ApiPropertyOptional({ description: 'API Base URL' })
  @IsOptional()
  @IsString()
  apiBaseUrl?: string;

  @ApiPropertyOptional({ description: 'API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'API Endpoint check' })
  @IsOptional()
  @IsString()
  apiEndpointCheck?: string;

  // SECTION 4: Terms
  @ApiPropertyOptional({ description: 'Đã đồng ý điều khoản' })
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;

}
