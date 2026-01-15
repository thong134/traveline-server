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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

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

  @Get('nearby')
  @ApiOperation({ summary: 'Tìm quán ăn gần đây' })
  @ApiQuery({ name: 'latitude', required: true, type: Number })
  @ApiQuery({ name: 'longitude', required: true, type: Number })
  @ApiOkResponse({ description: 'Danh sách quán ăn gần nhất' })
  searchNearby(
    @Query('latitude', { transform: (val) => Number(val) }) latitude: number,
    @Query('longitude', { transform: (val) => Number(val) }) longitude: number,
  ) {
    if (!latitude || !longitude) {
       throw new BadRequestException('Latitude and Longitude are required');
    }
    return this.service.searchNearby({ latitude, longitude });
  }

  @Get('debug/dump-names')
  @ApiOperation({ summary: 'Dump tên quán ăn để tìm tọa độ' })
  dumpNames() {
    return this.service.dumpNames();
  }

  @Get('random')
  @ApiOperation({ summary: 'Gợi ý quán ăn ngẫu nhiên' })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'ids', required: false, description: 'Danh sách ID quán ăn (cách nhau bởi dấu phẩy) để random trong danh sách này' })
  @ApiQuery({ name: 'scope', required: false, enum: ['all', 'favorites'] })
  @ApiOkResponse({ description: 'Quán ăn ngẫu nhiên' })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  random(
    @Query('province') province?: string,
    @Query('ids') ids?: string,
    @Query('scope') scope?: 'all' | 'favorites',
    @CurrentUser() user?: RequestUser,
  ) {
    if (scope === 'favorites' && !user) {
         throw new BadRequestException('Vui lòng đăng nhập để random từ danh sách yêu thích');
    }
    return this.service.random({ province, ids, scope, userId: user?.userId });
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

  @Get('favorites')
  @RequireAuth()
  @ApiOperation({ summary: 'Danh sách quán ăn yêu thích của tôi' })
  @ApiOkResponse({ description: 'Danh sách quán ăn được yêu thích' })
  findFavorites(@CurrentUser() user: RequestUser) {
    return this.service.findFavoritesByUser(user.userId);
  }
  @Post(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm quán ăn vào danh sách yêu thích' })
  async favorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    await this.service.favorite(id, user.userId);
    return { message: 'Added to favorites' };
  }

  @Delete(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa quán ăn khỏi danh sách yêu thích' })
  async unfavorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    await this.service.unfavorite(id, user.userId);
    return { message: 'Removed from favorites' };
  }
}
