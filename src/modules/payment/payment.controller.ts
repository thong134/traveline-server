import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  BadRequestException,
  UseGuards,
  ForbiddenException,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PayoutStatus } from './entities/payout.entity';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/entities/user-role.enum';
import { CreateVisaPaymentDto } from './dto/create-visa-payment.dto';
import { ServiceType } from './entities/booking-transaction.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('momo/result')
  @ApiOperation({ summary: 'Trang kết quả thanh toán MoMo (HTML)' })
  async handleMomoResult(@Query() query: any) {
    const isValid = this.paymentService.verifyMomoSignature(query);
    let errorMsg = '';
    
    if (!isValid) {
      errorMsg = 'Chữ ký không hợp lệ';
    } else {
      try {
        const result = await this.paymentService.finishMomoPayment(query);
        if (!result.ok) {
          errorMsg = result.message || 'Thanh toán thất bại';
        }
      } catch (err) {
        errorMsg = 'Lỗi hệ thống khi xử lý thanh toán';
      }
    }

    const isSuccess = query.resultCode === '0' && !errorMsg;
    const message = errorMsg || query.message || (isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại');
    const color = isSuccess ? '#28a745' : '#dc3545';
    const icon = isSuccess ? '✅' : '❌';

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Kết quả thanh toán</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8f9fa; }
              .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
              .icon { font-size: 4rem; margin-bottom: 1rem; }
              h1 { color: #333; margin-bottom: 0.5rem; }
              p { color: #666; margin-bottom: 1.5rem; line-height: 1.5; }
              .btn { background-color: ${color}; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; display: inline-block; font-weight: bold; transition: opacity 0.2s; }
              .btn:hover { opacity: 0.9; }
              .details { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee; font-size: 0.9rem; color: #888; text-align: left; }
              .details div { margin-bottom: 0.25rem; }
          </style>
      </head>
      <body>
          <div class="card">
              <div class="icon">${icon}</div>
              <h1>${isSuccess ? 'Thành công!' : 'Thất bại!'}</h1>
              <p>${message}</p>
              <a href="#" class="btn" onclick="handleFinish()">Quay lại ứng dụng</a>
              
              <div class="details">
                  <div><b>Mã đơn:</b> ${query.orderId}</div>
                  <div><b>Số tiền:</b> ${Number(query.amount).toLocaleString('vi-VN')} VND</div>
                  <div><b>Mã giao dịch:</b> ${query.transId || 'N/A'}</div>
              </div>
          </div>

          <script>
              function handleFinish() {
                  // Thử đóng window trước
                  if (window.opener || window.history.length === 1) {
                      window.close();
                  }
                  // Nếu không đóng được (mobile browser), trỏ về localhost hoặc deep link nếu có
                  setTimeout(() => {
                      window.location.href = 'index.html'; // Hoặc trỏ về App
                  }, 500);
              }
          </script>
      </body>
      </html>
    `;
  }

  @RequireAuth()
  @Post('momo/create')
  @ApiOperation({ summary: 'Tạo yêu cầu thanh toán MoMo cho đơn hàng' })
  createMomo(@Body() body: { billId: number; serviceType: ServiceType; amount: number }) {
    if (
      !body ||
      typeof body.billId !== 'number' ||
      !body.serviceType ||
      typeof body.amount !== 'number'
    ) {
      throw new BadRequestException('billId, serviceType và amount bắt buộc');
    }
    return this.paymentService.createMomoPayment({
      billId: body.billId,
      serviceType: body.serviceType,
      amount: body.amount,
    });
  }

  @RequireAuth()
  @Post('visa/create')
  @ApiOperation({ summary: 'Thanh toán bằng thẻ Visa (Mock)' })
  createVisa(@Body() dto: CreateVisaPaymentDto) {
    return this.paymentService.createVisaPayment(dto);
  }

  @Post('momo/ipn')
  @ApiOperation({ summary: 'IPN callback từ MoMo' })
  handleIpn(@Body() payload: any) {
    return this.paymentService.handleMomoIpn(payload);
  }

  @RequireAuth(UserRole.Admin)
  @Post('momo/refund/:id')
  @ApiOperation({ summary: 'Refund MoMo theo paymentId' })
  refund(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.refundMomo(id);
  }

  @RequireAuth()
  @Post('qr/confirm')
  @ApiOperation({ summary: 'Xác nhận thanh toán QR (thủ công/webhook)' })
  confirmQr(
    @Body() body: { paymentId?: number; billId: number; amount?: number },
  ) {
    if (!body || typeof body.billId !== 'number') {
      throw new BadRequestException('billId bắt buộc');
    }
    return this.paymentService.confirmQrPayment({
      paymentId: body.paymentId,
      billId: body.billId,
      amount: body.amount,
    });
  }

  @RequireAuth()
  @Post('payouts/:ownerId')
  @ApiOperation({ summary: 'Danh sách payout của chủ xe' })
  listPayouts(
    @Param('ownerId', ParseIntPipe) ownerId: number,
    @CurrentUser() user: RequestUser,
  ) {
    if (user.role !== UserRole.Admin && user.userId !== ownerId) {
      throw new ForbiddenException(
        'Chỉ admin hoặc chính chủ xe được xem payout',
      );
    }
    return this.paymentService.listPayoutsByOwner(ownerId);
  }

  @RequireAuth(UserRole.Admin)
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
    return this.paymentService.updatePayoutStatus({
      payoutId: id,
      status: body.status,
      note: body.note,
    });
  }
}
