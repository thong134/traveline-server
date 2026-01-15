import {
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
import { RestaurantTablesService } from './restaurant-tables.service';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('restaurant-tables')
@Controller('restaurant/tables')
export class RestaurantTablesController {
  constructor(private readonly service: RestaurantTablesService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Gieo dữ liệu mẫu nhà hàng và bàn' })
  seed() {
    return this.service.seedRestaurants();
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm nhà hàng kèm bàn trống (Mock)' })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'reservationTime', required: false })
  @ApiQuery({ name: 'guests', required: false, type: Number })
  @ApiQuery({ name: 'dishType', required: false })
  search(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('reservationTime') reservationTime?: string,
    @Query('guests') guests?: string,
    @Query('dishType') dishType?: string,
  ) {
    return this.service.searchRestaurants({
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      reservationTime,
      guests: guests ? Number(guests) : undefined,
      dishType,
    });
  }

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo bàn nhà hàng' })
  @ApiCreatedResponse({ description: 'Restaurant table created' })
  create(@Body() dto: CreateRestaurantTableDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách bàn nhà hàng' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'provinceId', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Restaurant table list' })
  findAll(
    @Query('cooperationId') cooperationId?: string,
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('active') active?: string,
  ) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      provinceId,
      districtId,
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết bàn nhà hàng' })
  @ApiOkResponse({ description: 'Restaurant table detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật bàn nhà hàng' })
  @ApiOkResponse({ description: 'Restaurant table updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantTableDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa bàn nhà hàng' })
  @ApiOkResponse({ description: 'Restaurant table removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
