import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDestinationBillDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  destinationId: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  ticketQuantity: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  visitDate: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  contactEmail?: string;
}
