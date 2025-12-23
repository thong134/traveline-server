import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
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
import { RequireVerification } from '../../auth/decorators/require-verification.decorator';

@ApiTags('restaurant-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/bookings')
export class RestaurantBookingsController {
  constructor(private readonly service: RestaurantBookingsService) {}

  @RequireVerification()
  @Post()
  @ApiOperation({ summary: 'Tạo đặt bàn nhà hàng (pending)' })
  create(
    @Body() dto: CreateRestaurantBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đặt bàn nhà hàng của tôi' })
  @ApiQuery({ name: 'status', required: false, enum: RestaurantBookingStatus })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RestaurantBookingStatus,
  ) {
    return this.service.findAll(user.userId, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đặt bàn nhà hàng' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin liên hệ cho đặt bàn' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận đặt bàn' })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.confirm(id, user.userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Hủy đặt bàn' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.cancel(id, user.userId);
  }
}
