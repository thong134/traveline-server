import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { RentalBillsService } from './rental-bill.service';
import { CreateRentalBillDto } from './dto/create-rental-bill.dto';
import { UpdateRentalBillDto } from './dto/update-rental-bill.dto';
import { ManageRentalBillVehicleDto } from './dto/manage-rental-bill-vehicle.dto';
import { RentalBillStatus } from './entities/rental-bill.entity';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('rental-bills')
@RequireAuth()
@Controller('rental-bills')
export class RentalBillsController {
  constructor(private readonly service: RentalBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn thuê xe mới (trạng thái pending)' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRentalBillDto,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Danh sách hóa đơn của tôi' })
  @ApiQuery({ name: 'status', required: false, enum: RentalBillStatus })
  findMyBills(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RentalBillStatus,
  ) {
    return this.service.findAll(user.userId, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hóa đơn thuê xe' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin liên hệ và ghi chú cho hóa đơn' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateRentalBillDto,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận thông tin và chọn phương thức thanh toán' })
  @ApiQuery({ name: 'paymentMethod', required: true, example: 'wallet' })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Query('paymentMethod') paymentMethod: string,
  ) {
    return this.service.confirm(id, user.userId, paymentMethod);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Thực hiện thanh toán' })
  pay(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.pay(id, user.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành hóa đơn (Admin hoặc Người dùng)' })
  complete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.complete(id, user.userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Hủy hóa đơn' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.cancel(id, user.userId);
  }

  @Patch(':id/vehicles/add')
  @ApiOperation({ summary: 'Thêm xe vào hóa đơn đang pending' })
  addVehicle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ManageRentalBillVehicleDto,
  ) {
    return this.service.addVehicleToBill(id, user.userId, dto);
  }

  @Patch(':id/vehicles/remove')
  @ApiOperation({ summary: 'Xóa xe khỏi hóa đơn đang pending' })
  @ApiQuery({ name: 'licensePlate', required: true })
  removeVehicle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Query('licensePlate') licensePlate: string,
  ) {
    return this.service.removeVehicleFromBill(id, user.userId, licensePlate);
  }

  @Get(':id/payment-qr')
  @ApiOperation({ summary: 'Tạo mã QR thanh toán' })
  generateQR(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.generatePaymentQR(id, user.userId);
  }
}
