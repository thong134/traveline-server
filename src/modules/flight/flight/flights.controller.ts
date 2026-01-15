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
import { FlightsService } from './flights.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('flights')
@Controller('flight/flights')
export class FlightsController {
  constructor(private readonly service: FlightsService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Gieo dữ liệu mẫu chuyến bay' })
  seed() {
    return this.service.seedFlights();
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm chuyến bay kèm sơ đồ ghế (Mock)' })
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
    return this.service.searchFlights({
      from,
      to,
      date,
      isRoundTrip: isRoundTrip === 'true',
      passengers: passengers ? Number(passengers) : undefined,
    });
  }

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo chuyến bay' })
  @ApiCreatedResponse({ description: 'Flight created' })
  create(@Body() dto: CreateFlightDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách chuyến bay' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'provinceId', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'airline', required: false, type: String })
  @ApiQuery({ name: 'departureAirport', required: false, type: String })
  @ApiQuery({ name: 'arrivalAirport', required: false, type: String })
  @ApiOkResponse({ description: 'Flight list' })
  findAll(
    @Query('cooperationId') cooperationId?: string,
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('airline') airline?: string,
    @Query('departureAirport') departureAirport?: string,
    @Query('arrivalAirport') arrivalAirport?: string,
  ) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      provinceId,
      districtId,
      airline: airline ?? undefined,
      departureAirport: departureAirport ?? undefined,
      arrivalAirport: arrivalAirport ?? undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chuyến bay' })
  @ApiOkResponse({ description: 'Flight detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật chuyến bay' })
  @ApiOkResponse({ description: 'Flight updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFlightDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa chuyến bay' })
  @ApiOkResponse({ description: 'Flight removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
