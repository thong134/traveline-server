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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RestaurantBookingsService } from './restaurant-booking.service';
import { CreateRestaurantBookingDto } from './dto/create-restaurant-booking.dto';
import { UpdateRestaurantBookingDto } from './dto/update-restaurant-booking.dto';
import { RestaurantBookingStatus } from './entities/restaurant-booking.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('restaurant-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/bookings')
export class RestaurantBookingsController {
  constructor(private readonly service: RestaurantBookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo đặt bàn nhà hàng' })
  @ApiCreatedResponse({ description: 'Restaurant booking created' })
  create(
    @Body() dto: CreateRestaurantBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đặt bàn nhà hàng' })
  @ApiQuery({ name: 'tableId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RestaurantBookingStatus })
  @ApiOkResponse({ description: 'Restaurant booking list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('tableId') tableId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: RestaurantBookingStatus,
  ) {
    return this.service.findAll(user.userId, {
      tableId: tableId ? Number(tableId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đặt bàn nhà hàng' })
  @ApiOkResponse({ description: 'Restaurant booking detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật đặt bàn nhà hàng' })
  @ApiOkResponse({ description: 'Restaurant booking updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đặt bàn nhà hàng' })
  @ApiOkResponse({ description: 'Restaurant booking removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
