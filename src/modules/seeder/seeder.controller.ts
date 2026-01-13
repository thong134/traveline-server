import { Controller, Post, Get, Query } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Seeder & Mocks')
@Controller('seeder')
export class SeederController {
  constructor(private readonly seederService: SeederService) {}

  @Post('seed-partners')
  @ApiOperation({
    summary:
      'Seed famous brands (Hotel, Restaurant, Bus, Train, Flight, Delivery, Tour)',
  })
  async seedPartners() {
    return this.seederService.seedPartners();
  }

  @Post('seed-service-data')
  @ApiOperation({
    summary:
      'Seed objects (Rooms, Tables, Vehicles, Routes) for existing partners',
  })
  async seedServiceData() {
    return this.seederService.seedServiceData();
  }

  @Get('mock/hotel-availability')
  @ApiOperation({
    summary: 'Mock API: Get available hotel rooms based on filter criteria',
  })
  @ApiQuery({ name: 'provinceId', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'checkInDate', required: false })
  @ApiQuery({ name: 'checkOutDate', required: false })
  @ApiQuery({ name: 'guests', required: false, type: Number })
  async getMockHotelRooms(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
    @Query('guests') guests?: string,
  ) {
    return this.seederService.getMockHotelRooms({
      provinceId,
      districtId,
      checkInDate,
      checkOutDate,
      guests: guests ? parseInt(guests) : undefined,
    });
  }

  @Get('mock/restaurant-availability')
  @ApiOperation({
    summary:
      'Mock API: Get available restaurant tables based on filter criteria',
  })
  @ApiQuery({ name: 'provinceId', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'guests', required: false, type: Number })
  async getMockRestaurantTables(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('date') date?: string,
    @Query('guests') guests?: string,
  ) {
    return this.seederService.getMockRestaurantTables({
      provinceId,
      districtId,
      date,
      guests: guests ? parseInt(guests) : undefined,
    });
  }

  @Get('mock/bus-availability')
  @ApiOperation({
    summary: 'Mock API: Get available buses with seat maps based on route',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'date', required: false })
  async getMockBusAvailability(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
    return this.seederService.getMockTransport('bus', { from, to, date });
  }

  @Get('mock/train-availability')
  @ApiOperation({
    summary: 'Mock API: Get available train routes with cabin maps',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'date', required: false })
  async getMockTrainAvailability(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
    return this.seederService.getMockTransport('train', { from, to, date });
  }

  @Get('mock/flight-availability')
  @ApiOperation({ summary: 'Mock API: Get available flights with seat maps' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'date', required: false })
  async getMockFlightAvailability(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
    return this.seederService.getMockTransport('flight', { from, to, date });
  }

}
