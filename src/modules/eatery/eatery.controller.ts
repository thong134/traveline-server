import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EateriesService } from './eatery.service';
import { CreateEateryDto } from './dto/create-eatery.dto';
import { UpdateEateryDto } from './dto/update-eatery.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('eateries')
@Controller('eateries')
export class EateriesController {
  constructor(private readonly service: EateriesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo quán ăn nổi tiếng' })
  @ApiCreatedResponse({ description: 'Tạo quán ăn thành công' })
  create(@Body() dto: CreateEateryDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách quán ăn nổi tiếng' })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiOkResponse({ description: 'Danh sách quán ăn' })
  findAll(
    @Query('province') province?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.findAll({ province, keyword });
  }

  @Get('random')
  @ApiOperation({ summary: 'Gợi ý quán ăn ngẫu nhiên theo tỉnh' })
  @ApiQuery({ name: 'province', required: true })
  @ApiOkResponse({ description: 'Quán ăn ngẫu nhiên theo tỉnh' })
  random(@Query('province') province?: string) {
    if (!province || !province.trim()) {
      throw new BadRequestException('province là bắt buộc');
    }
    return this.service.randomByProvince(province);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết quán ăn' })
  @ApiOkResponse({ description: 'Chi tiết quán ăn' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin quán ăn' })
  @ApiOkResponse({ description: 'Đã cập nhật quán ăn' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEateryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa quán ăn nổi tiếng' })
  @ApiOkResponse({ description: 'Đã xóa quán ăn' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm quán ăn vào danh sách yêu thích' })
  @ApiOkResponse({ description: 'Đã thêm quán ăn vào yêu thích' })
  favorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.favorite(user.userId, id);
  }

  @Delete(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Bỏ quán ăn khỏi danh sách yêu thích' })
  @ApiOkResponse({ description: 'Đã bỏ quán ăn khỏi yêu thích' })
  unfavorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.unfavorite(user.userId, id);
  }
}
