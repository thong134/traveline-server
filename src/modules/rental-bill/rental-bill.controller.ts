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
import { RentalOwnerCancelDto } from './dto/owner-cancel-bill.dto';
import { PaymentMethod, RentalBillStatus, RentalProgressStatus } from './entities/rental-bill.entity';
import {
  DeliveryActionDto,
  PickupActionDto,
  ReturnRequestDto,
  ConfirmReturnDto,
} from './dto/rental-workflow.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { RequireVerification } from '../auth/decorators/require-verification.decorator';

@ApiTags('rental-bills')
@RequireAuth()
@Controller('rental-bills')
export class RentalBillsController {
  constructor(private readonly service: RentalBillsService) {}

  @RequireVerification()
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

  @RequireVerification()
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận thông tin và chọn phương thức thanh toán' })
  @ApiQuery({ name: 'paymentMethod', required: true, enum: PaymentMethod })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Query('paymentMethod') paymentMethod: PaymentMethod,
  ) {
    return this.service.confirm(id, user.userId, paymentMethod);
  }

  @RequireVerification()
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
  @ApiOperation({ summary: 'Người dùng: Hủy hóa đơn' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.cancel(id, user.userId);
  }

  @Patch(':id/owner-cancel')
  @ApiOperation({ summary: 'Chủ xe: Hủy hóa đơn đã thanh toán (Hoàn tiền)' })
  ownerCancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: RentalOwnerCancelDto,
  ) {
    return this.service.ownerCancel(id, user.userId, dto.reason);
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

  // --- WORKFLOW ENDPOINTS ---

  @Patch(':id/delivering')
  @ApiOperation({ summary: 'Chủ xe: Xác nhận đang vận chuyển xe đến' })
  ownerDelivering(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    // In a production app, we would verify if user is the owner
    return this.service.ownerDelivering(id, user.userId);
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: 'Chủ xe: Xác nhận đã giao xe đến nơi' })
  ownerDelivered(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: DeliveryActionDto,
  ) {
    return this.service.ownerDelivered(id, user.userId, dto);
  }

  @RequireVerification()
  @Patch(':id/pickup')
  @ApiOperation({ summary: 'Người dùng: Xác thực selfie và nhận xe' })
  userPickup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: PickupActionDto,
  ) {
    return this.service.userPickup(id, user.userId, dto);
  }

  @RequireVerification()
  @Patch(':id/return-request')
  @ApiOperation({ summary: 'Người dùng: Yêu cầu trả xe (Gửi GPS + Ảnh)' })
  userReturnRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReturnRequestDto,
  ) {
    return this.service.userReturnRequest(id, user.userId, dto);
  }

  @Patch(':id/confirm-return')
  @ApiOperation({ summary: 'Chủ xe: Xác nhận đã nhận xe (Validate GPS < 50m)' })
  ownerConfirmReturn(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ConfirmReturnDto,
  ) {
    return this.service.ownerConfirmReturn(id, user.userId, dto);
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
