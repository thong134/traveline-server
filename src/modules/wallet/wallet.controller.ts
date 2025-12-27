import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { WalletDepositDto } from './dto/wallet-deposit.dto';
import { WalletPayDto } from './dto/wallet-pay.dto';
import { MomoDepositDto } from './dto/momo-deposit.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { MomoService } from './momo/momo.service';
import { CreateMomoPaymentDto } from './dto/create-momo-payment.dto';
import * as uuid from 'uuid';

@ApiTags('wallet')
@ApiBearerAuth()
@RequireAuth()
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly momoService: MomoService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Lấy số dư ví hiện tại' })
  @ApiQuery({
    name: 'currency',
    required: false,
    description: 'Future currency conversion (defaults to VND)',
  })
  @ApiOkResponse({ description: 'Số dư ví của người dùng' })
  async getBalance(
    @CurrentUser() user: RequestUser,
    @Query('currency') currency?: string,
  ) {
    const balance = await this.walletService.getBalance(user.userId);
    return { balance, currency: (currency ?? 'VND').toUpperCase() };
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Nạp tiền vào ví' })
  @ApiOkResponse({ description: 'Số dư sau khi nạp' })
  async deposit(
    @CurrentUser() user: RequestUser,
    @Body() dto: WalletDepositDto,
  ) {
    return this.walletService.deposit(user.userId, dto.amount, dto.referenceId);
  }

  @Post('pay')
  @ApiOperation({ summary: 'Thanh toán bằng ví' })
  @ApiOkResponse({ description: 'Số dư sau khi thanh toán' })
  async pay(@CurrentUser() user: RequestUser, @Body() dto: WalletPayDto) {
    return this.walletService.pay(user.userId, dto.amount, dto.referenceId);
  }

  @Post('momo-deposit')
  @ApiOperation({ summary: 'Nạp tiền qua MoMo (giả lập)' })
  @ApiOkResponse({ description: 'Số dư sau khi nạp qua MoMo' })
  async momoDeposit(
    @CurrentUser() user: RequestUser,
    @Body() dto: MomoDepositDto,
  ) {
    return this.walletService.simulateMomoDeposit(
      user.userId,
      dto.amount,
      dto.momoTransactionId,
    );
  }

  @Post('create-momo-payment')
  @ApiOperation({ summary: 'Tạo link thanh toán MoMo (Sandbox)' })
  @ApiOkResponse({ description: 'URL thanh toán MoMo' })
  async createMomoPayment(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMomoPaymentDto,
  ) {
    const orderId = `MOMO_${user.userId}_${uuid.v4().split('-')[0]}_${Date.now()}`;
    const orderInfo = dto.orderInfo ?? `Nap tien vao vi Traveline user ${user.userId}`;
    
    // extraData chứa userId để khi IPN gọi về ta biết là nạp cho user nào
    const extraData = Buffer.from(JSON.stringify({ userId: user.userId })).toString('base64');

    const result = await this.momoService.createPaymentUrl(
      orderId,
      dto.amount,
      orderInfo,
      extraData,
    );
    return result;
  }

  @Post('momo-ipn')
  @ApiOperation({ summary: 'Webhook nhận kết quả từ MoMo (IPN)' })
  @ApiExcludeEndpoint() // Ẩn khỏi Swagger vì đây là API callback của MoMo
  async handleMomoIpn(@Body() body: any) {
    console.log('Received MoMo IPN:', body);
    
    // 1. Xác thực chữ ký
    const isValid = this.momoService.verifySignature(body);
    if (!isValid) {
      console.error('Invalid MoMo Signature');
      // Tuy nhiên vẫn trả về status 204 hoặc 400 đe MoMo biết
      return { message: 'Invalid signature' }; 
    }

    // 2. Kiểm tra resultCode
    if (body.resultCode === 0) {
      // Thanh toán thành công
      // Giải mã extraData để lấy userId
      let userId: number | null = null;
      try {
         const decodedExtra = Buffer.from(body.extraData, 'base64').toString('utf8');
         const obj = JSON.parse(decodedExtra);
         userId = obj.userId;
      } catch (e) {
         console.error('Cannot parse extraData', e);
      }

      if (userId) {
        // Cộng tiền vào ví thật (không phải giả lập)
        // Chúng ta có thể dùng lại simulateMomoDeposit hoặc viết hàm mới 'processMomoDeposit'
        // Ở đây tôi sẽ dùng simulateMomoDeposit vì logic nó đúng là: cộng tiền + lưu transaction với referenceId
        await this.walletService.simulateMomoDeposit(userId, body.amount, body.transId.toString());
        console.log(`Updated wallet for user ${userId} with amount ${body.amount}`);
      }
    }

    // MoMo yêu cầu không cần trả về body, chỉ cần status 204 No Content là mặc định OK
    // Nhưng NestJS mặc định 201 Created. Cứ return object đơn giản.
    return { message: 'IPN received' };
  }
}
