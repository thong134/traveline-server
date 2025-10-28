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
import { RestaurantBookingsService } from './restaurant-bookings.service';
import { CreateRestaurantBookingDto } from './dto/create-restaurant-booking.dto';
import { UpdateRestaurantBookingDto } from './dto/update-restaurant-booking.dto';
import { RestaurantBookingStatus } from './restaurant-booking.entity';

@ApiTags('restaurant-bookings')
@Controller('restaurant/bookings')
export class RestaurantBookingsController {
  constructor(private readonly service: RestaurantBookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create restaurant booking' })
  @ApiCreatedResponse({ description: 'Restaurant booking created' })
  create(@Body() dto: CreateRestaurantBookingDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List restaurant bookings' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'tableId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RestaurantBookingStatus })
  @ApiOkResponse({ description: 'Restaurant booking list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('tableId') tableId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: RestaurantBookingStatus,
  ) {
    return this.service.findAll({
      userId: userId ? Number(userId) : undefined,
      tableId: tableId ? Number(tableId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant booking detail' })
  @ApiOkResponse({ description: 'Restaurant booking detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update restaurant booking' })
  @ApiOkResponse({ description: 'Restaurant booking updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantBookingDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove restaurant booking' })
  @ApiOkResponse({ description: 'Restaurant booking removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
