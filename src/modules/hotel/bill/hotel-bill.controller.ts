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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { HotelBillsService } from './hotel-bill.service';
import { CreateHotelBillDto } from './dto/create-hotel-bill.dto';
import { UpdateHotelBillDto } from './dto/update-hotel-bill.dto';
import { HotelBillStatus } from './entities/hotel-bill.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { RequireVerification } from '../../auth/decorators/require-verification.decorator';

@ApiTags('hotel-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel-bills')
export class HotelBillsController {
  constructor(private readonly hotelBillsService: HotelBillsService) {}

  @RequireVerification()
  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn đặt phòng khách sạn (pending)' })
  create(@Body() dto: CreateHotelBillDto, @CurrentUser() user: RequestUser) {
    return this.hotelBillsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hóa đơn của tôi' })
  @ApiQuery({ name: 'status', required: false, enum: HotelBillStatus })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: HotelBillStatus,
  ) {
    return this.hotelBillsService.findAll(user.userId, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hóa đơn khách sạn' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin liên hệ cho hóa đơn' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHotelBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.update(id, user.userId, dto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận hóa đơn và chọn phương thức thanh toán' })
  @ApiQuery({ name: 'paymentMethod', required: true })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Query('paymentMethod') paymentMethod: string,
  ) {
    return this.hotelBillsService.confirm(id, user.userId, paymentMethod);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Thanh toán hóa đơn' })
  pay(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.pay(id, user.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành hóa đơn' })
  complete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.complete(id, user.userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Hủy hóa đơn' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.cancel(id, user.userId);
  }
}
