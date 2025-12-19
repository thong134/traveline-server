import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTravelRouteDto {
  @ApiProperty({ description: 'Route name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Province name' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Route start date (ISO string)' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, {
    message: 'startDate phải ở định dạng dd/MM/yyyy hoặc yyyy-MM-dd',
  })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Route end date (ISO string)' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, {
    message: 'endDate phải ở định dạng dd/MM/yyyy hoặc yyyy-MM-dd',
  })
  endDate?: string;
}
