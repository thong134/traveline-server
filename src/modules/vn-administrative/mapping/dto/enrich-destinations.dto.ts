import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class EnrichDestinationsDto {
  @ApiPropertyOptional({
    description: 'Chạy thử mà không ghi xuống cơ sở dữ liệu',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = true;

  @ApiPropertyOptional({
    description: 'Ghi lại specificAddress với tên quận/huyện kế thừa',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  rewriteSpecificAddress?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Giữ lại các địa điểm đã có trường district, mặc định chỉ xử lý các bản ghi chưa có',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCompleted?: boolean = false;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi tối đa cần xử lý trong lần chạy này',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
