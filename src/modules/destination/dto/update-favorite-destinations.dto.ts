import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min } from 'class-validator';

export class UpdateFavoriteDestinationsDto {
  @ApiProperty({
    type: [Number],
    description: 'Danh sách id địa điểm yêu thích',
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  destinationIds!: number[];
}
