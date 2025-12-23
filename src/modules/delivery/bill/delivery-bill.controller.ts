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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DeliveryBillsService } from './delivery-bill.service';
import { CreateDeliveryBillDto } from './dto/create-delivery-bill.dto';
import { UpdateDeliveryBillDto } from './dto/update-delivery-bill.dto';
import { DeliveryBillStatus } from './entities/delivery-bill.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { RequireVerification } from '../../auth/decorators/require-verification.decorator';

@ApiTags('delivery-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('delivery-bills')
export class DeliveryBillsController {
  constructor(private readonly service: DeliveryBillsService) {}

  @RequireVerification()
  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn vận chuyển (pending)' })
  create(@Body() dto: CreateDeliveryBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hóa đơn của tôi' })
  @ApiQuery({ name: 'status', required: false, enum: DeliveryBillStatus })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: DeliveryBillStatus,
  ) {
    return this.service.findAll(user.userId, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hóa đơn vận chuyển' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin liên hệ và địa chỉ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận thông tin và chọn phương thức thanh toán' })
  @ApiQuery({ name: 'paymentMethod', required: true })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Query('paymentMethod') paymentMethod: string,
  ) {
    return this.service.confirm(id, user.userId, paymentMethod);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Thanh toán và lấy trạng thái đang vận chuyển' })
  pay(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.pay(id, user.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành vận chuyển' })
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
}
