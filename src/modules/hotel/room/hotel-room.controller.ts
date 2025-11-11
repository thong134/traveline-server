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

@ApiTags('hotel-rooms')
@Controller('hotel-rooms')
export class HotelRoomsController {
  constructor(private readonly hotelRoomsService: HotelRoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create hotel room' })
  @ApiCreatedResponse({ description: 'Hotel room created' })
  create(@Body() dto: CreateHotelRoomDto) {
    return this.hotelRoomsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search hotel rooms' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'province', required: false })
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
    @Query('city') city?: string,
    @Query('province') province?: string,
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
      city,
      province,
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
  @ApiOperation({ summary: 'Get hotel room detail' })
  @ApiOkResponse({ description: 'Hotel room detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
  ) {
    return this.hotelRoomsService.findOne(id, { checkInDate, checkOutDate });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hotel room information' })
  @ApiOkResponse({ description: 'Hotel room updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHotelRoomDto,
  ) {
    return this.hotelRoomsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete hotel room' })
  @ApiOkResponse({ description: 'Hotel room removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.hotelRoomsService.remove(id);
  }
}
