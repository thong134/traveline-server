import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
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
import { CooperationsService } from './cooperation.service';
import {
  PartnerCatalogService,
  HotelAvailabilityResponse,
} from './partner-catalog.service';
import { CreateCooperationDto } from './dto/create-cooperation.dto';
import { UpdateCooperationDto } from './dto/update-cooperation.dto';
import { HotelAvailabilityQueryDto } from './dto/hotel-availability-query.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('cooperations')
@Controller('cooperations')
export class CooperationsController {
  constructor(
    private readonly cooperationsService: CooperationsService,
    private readonly partnerCatalogService: PartnerCatalogService,
  ) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo đối tác hợp tác mới' })
  @ApiCreatedResponse({ description: 'Cooperation created' })
  create(@Body() dto: CreateCooperationDto) {
    return this.cooperationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đối tác hợp tác' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Cooperation list' })
  findAll(
    @Query('type') type?: string,
    @Query('city') city?: string,
    @Query('province') province?: string,
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ) {
    return this.cooperationsService.findAll({ type, city, province, active });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đối tác hợp tác' })
  @ApiOkResponse({ description: 'Cooperation detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cooperationsService.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin đối tác' })
  @ApiOkResponse({ description: 'Cooperation updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCooperationDto,
  ) {
    return this.cooperationsService.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa đối tác hợp tác' })
  @ApiOkResponse({ description: 'Cooperation removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cooperationsService.remove(id);
  }

  @Get('favorites')
  @RequireAuth()
  @ApiOperation({ summary: 'Danh sách đối tác yêu thích của tôi' })
  @ApiOkResponse({ description: 'Danh sách đối tác được yêu thích' })
  findFavorites(@CurrentUser() user: RequestUser) {
    return this.cooperationsService.findFavoritesByUser(user.userId);
  }  @Post(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm đối tác vào danh sách yêu thích' })
  async favorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    await this.cooperationsService.favorite(id, user.userId);
    return { message: 'Added to favorites' };
  }

  @Delete(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa đối tác khỏi danh sách yêu thích' })
  async unfavorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    await this.cooperationsService.unfavorite(id, user.userId);
    return { message: 'Removed from favorites' };
  }

  @Get(':id/hotel-availability')
  @ApiOperation({
    summary:
      'Demo: lấy dữ liệu phòng khách sạn từ API đối tác thông qua hợp tác',
    description:
      'Giả lập gọi sang hệ thống đối tác để lấy thông tin phòng trống dựa trên cooperation đã ký kết.',
  })
  @ApiOkResponse({ description: 'Hotel availability from partner mock API' })
  getHotelAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: HotelAvailabilityQueryDto,
  ): Promise<HotelAvailabilityResponse> {
    return this.partnerCatalogService.getHotelAvailability(id, query);
  }
}
