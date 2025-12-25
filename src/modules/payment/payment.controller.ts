import { Body, Controller, Param, ParseIntPipe, Post, BadRequestException, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PayoutStatus } from './entities/payout.entity';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/entities/user-role.enum';

@ApiTags('payments')
@RequireAuth()
@UseGuards(RolesGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('momo/create')
  @ApiOperation({ summary: 'Tạo yêu cầu thanh toán MoMo cho rental' })
  createMomo(@Body() body: { rentalId: number; amount: number }) {
    if (!body || typeof body.rentalId !== 'number' || typeof body.amount !== 'number') {
      throw new BadRequestException('rentalId và amount bắt buộc');
    }
    return this.paymentService.createMomoPayment({
      rentalId: body.rentalId,
      amount: body.amount,
    });
  }

  @Post('momo/ipn')
  @ApiOperation({ summary: 'IPN callback từ MoMo' })
  handleIpn(@Body() payload: any) {
    return this.paymentService.handleMomoIpn(payload);
  }

  @Post('momo/refund/:id')
  @ApiOperation({ summary: 'Refund MoMo theo paymentId' })
  refund(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.refundMomo(id);
  }

  @Post('qr/confirm')
  @ApiOperation({ summary: 'Xác nhận thanh toán QR (thủ công/webhook)' })
  confirmQr(@Body() body: { paymentId?: number; rentalId: number; amount?: number }) {
    if (!body || typeof body.rentalId !== 'number') {
      throw new BadRequestException('rentalId bắt buộc');
    }
    return this.paymentService.confirmQrPayment({
      paymentId: body.paymentId,
      rentalId: body.rentalId,
      amount: body.amount,
    });
  }

  @Post('payouts/:ownerId')
  @ApiOperation({ summary: 'Danh sách payout của chủ xe' })
  listPayouts(
    @Param('ownerId', ParseIntPipe) ownerId: number,
    @CurrentUser() user: RequestUser,
  ) {
    if (user.role !== UserRole.Admin && user.userId !== ownerId) {
      throw new ForbiddenException('Chỉ admin hoặc chính chủ xe được xem payout');
    }
    return this.paymentService.listPayoutsByOwner(ownerId);
  }

  @Post('payouts/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái payout (admin/internal)' })
  updatePayoutStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: PayoutStatus; note?: string },
    @CurrentUser() user: RequestUser,
  ) {
    if (!body || !body.status) {
      throw new BadRequestException('status bắt buộc');
    }
    if (user.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ admin mới cập nhật trạng thái payout');
    }
    return this.paymentService.updatePayoutStatus({ payoutId: id, status: body.status, note: body.note });
  }
}
