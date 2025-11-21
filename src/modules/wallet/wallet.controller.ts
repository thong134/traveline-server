import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { WalletDepositDto } from './dto/wallet-deposit.dto';
import { WalletPayDto } from './dto/wallet-pay.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('wallet')
@ApiBearerAuth()
@RequireAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Lấy số dư ví hiện tại' })
  @ApiQuery({ name: 'currency', required: false, description: 'Future currency conversion (defaults to VND)' })
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
}
