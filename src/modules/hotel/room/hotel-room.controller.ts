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
import { HotelRoomsService } from './hotel-room.service';
import { CreateHotelRoomDto } from './dto/create-hotel-room.dto';
import { UpdateHotelRoomDto } from './dto/update-hotel-room.dto';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('hotel-rooms')
@Controller('hotel-rooms')
export class HotelRoomsController {
  constructor(private readonly hotelRoomsService: HotelRoomsService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Gieo dữ liệu mẫu khách sạn và phòng' })
  seed() {
    return this.hotelRoomsService.seedHotels();
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm khách sạn kèm phòng trống (Mock)' })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'checkInDate', required: false })
  @ApiQuery({ name: 'checkOutDate', required: false })
  @ApiQuery({ name: 'guests', required: false, type: Number })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  search(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
    @Query('guests') guests?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.hotelRoomsService.searchHotels({
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      checkInDate,
      checkOutDate,
      guests: guests ? Number(guests) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo phòng khách sạn' })
  @ApiCreatedResponse({ description: 'Hotel room created' })
  create(@Body() dto: CreateHotelRoomDto) {
    return this.hotelRoomsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Tìm kiếm phòng khách sạn' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'provinceId', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'maxPeople', required: false, type: Number })
  @ApiQuery({ name: 'numberOfBeds', required: false, type: Number })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'checkInDate', required: false })
  @ApiQuery({ name: 'checkOutDate', required: false })
  @ApiQuery({
    name: 'quantity',
    required: false,
    type: Number,
    description: 'Number of rooms needed',
  })
  @ApiOkResponse({ description: 'Hotel room list' })
  findAll(
    @Query('cooperationId') cooperationId?: string,
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('maxPeople') maxPeople?: string,
    @Query('numberOfBeds') numberOfBeds?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('status') status?: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
    @Query('quantity') quantity?: string,
  ) {
    return this.hotelRoomsService.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      provinceId,
      districtId,
      maxPeople: maxPeople ? Number(maxPeople) : undefined,
      numberOfBeds: numberOfBeds ? Number(numberOfBeds) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      status,
      checkInDate,
      checkOutDate,
      quantity: quantity ? Number(quantity) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phòng khách sạn' })
  @ApiOkResponse({ description: 'Hotel room detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
  ) {
    return this.hotelRoomsService.findOne(id, { checkInDate, checkOutDate });
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin phòng khách sạn' })
  @ApiOkResponse({ description: 'Hotel room updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHotelRoomDto,
  ) {
    return this.hotelRoomsService.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa phòng khách sạn' })
  @ApiOkResponse({ description: 'Hotel room removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.hotelRoomsService.remove(id);
  }
}
