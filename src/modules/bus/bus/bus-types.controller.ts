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
import { BusTypesService } from './bus-types.service';
import { CreateBusTypeDto } from './dto/create-bus-type.dto';
import { UpdateBusTypeDto } from './dto/update-bus-type.dto';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('bus-types')
@Controller('bus/types')
export class BusTypesController {
  constructor(private readonly service: BusTypesService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Gieo dữ liệu mẫu xe khách' })
  seed() {
    return this.service.seedBus();
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm chuyến xe kèm sơ đồ ghế (Mock)' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'isRoundTrip', required: false, type: Boolean })
  @ApiQuery({ name: 'passengers', required: false, type: Number })
  search(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
    @Query('isRoundTrip') isRoundTrip?: string,
    @Query('passengers') passengers?: string,
  ) {
    return this.service.searchBusTrips({
      from,
      to,
      date,
      isRoundTrip: isRoundTrip === 'true',
      passengers: passengers ? Number(passengers) : undefined,
    });
  }

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo loại xe buýt' })
  @ApiCreatedResponse({ description: 'Bus type created' })
  create(@Body() dto: CreateBusTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách loại xe buýt' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'provinceId', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo tuyến đường' })
  @ApiOkResponse({ description: 'Bus type list' })
  findAll(
    @Query('cooperationId') cooperationId?: string,
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('q') q?: string,
  ) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      provinceId,
      districtId,
      q,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết loại xe buýt' })
  @ApiOkResponse({ description: 'Bus type detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật loại xe buýt' })
  @ApiOkResponse({ description: 'Bus type updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa loại xe buýt' })
  @ApiOkResponse({ description: 'Bus type removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
