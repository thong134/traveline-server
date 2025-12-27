import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethodType, PaymentStatus } from './entities/payment.entity';
import { Payout, PayoutStatus } from './entities/payout.entity';
import { RentalBill, RentalBillStatus, RentalProgressStatus } from '../rental-bill/entities/rental-bill.entity';
import { User } from '../user/entities/user.entity';
import axios from 'axios';
import { createHmac } from 'crypto';

interface CreateMomoPaymentParams {
  rentalId: number;
  amount: number;
}

interface CreateQrPaymentParams {
  rentalId: number;
  amount: number;
  qrData: string;
}

interface ConfirmQrPaymentParams {
  paymentId?: number;
  rentalId: number;
  amount?: number;
}

interface CreatePayoutParams {
  rentalId: number;
  ownerUserId: number;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  note?: string;
}

interface MomoIpnPayload {
  orderId?: string;
  requestId?: string;
  resultCode?: number;
  message?: string;
  signature?: string;
  amount?: number;
  extraData?: string;
  transId?: number;
}

interface UpdatePayoutStatusParams {
  payoutId: number;
  status: PayoutStatus;
  note?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(RentalBill)
    private readonly rentalRepo: Repository<RentalBill>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createMomoPayment(params: CreateMomoPaymentParams): Promise<{ payUrl: string; paymentId: number; }> {
    const { rentalId, amount } = params;
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new BadRequestException(`Không tìm thấy rental ${rentalId}`);
    }
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const endpoint = process.env.MOMO_ENDPOINT;
    const ipnUrl = process.env.MOMO_IPN_URL;
    const redirectUrl = process.env.FRONTEND_RETURN_URL ?? 'https://localhost';

    if (!partnerCode || !accessKey || !secretKey || !endpoint || !ipnUrl) {
      throw new BadRequestException('Thiếu cấu hình MoMo (partnerCode/accessKey/secretKey/endpoint/ipnUrl)');
    }

    const orderId = `rental_${rental.id}_${Date.now()}`;
    const requestId = `${Date.now()}`;
    const orderInfo = `Rental ${rental.code}`;
    const rawAmount = amount.toFixed(0);

    const rawSignature = `accessKey=${accessKey}&amount=${rawAmount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
    const signature = createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const body = {
      partnerCode,
      accessKey,
      requestId,
      amount: rawAmount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType: 'captureWallet',
      extraData: '',
      signature,
      lang: 'vi',
    };

    const payment = this.paymentRepo.create({
      rentalId: rental.id,
      method: PaymentMethodType.MOMO,
      amount: amount.toFixed(2),
      currency: 'VND',
      status: PaymentStatus.PENDING,
      orderId,
      requestId,
      metadata: { orderInfo },
    });
    const saved = await this.paymentRepo.save(payment);

    try {
      const res = await axios.post(endpoint, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      const payUrl = res.data?.payUrl ?? res.data?.deeplink ?? '';
      await this.paymentRepo.update(saved.id, { payUrl, rawResponse: res.data });
      if (!payUrl) {
        throw new Error('MoMo trả về thiếu payUrl');
      }
      return { payUrl, paymentId: saved.id };
    } catch (error) {
      this.logger.error('MoMo createPayment failed', error instanceof Error ? error.stack : undefined);
      const raw: Record<string, unknown> | undefined =
        error instanceof Error ? { message: error.message } : undefined;
      await this.paymentRepo.update(saved.id, {
        status: PaymentStatus.FAILED,
        rawResponse: raw as any,
      });
      throw new BadRequestException('Tạo yêu cầu thanh toán MoMo thất bại');
    }
  }

  async createQrPayment(params: CreateQrPaymentParams): Promise<{ payUrl: string; paymentId: number }> {
    const { rentalId, amount, qrData } = params;
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new BadRequestException(`Không tìm thấy rental ${rentalId}`);
    }
    const payment = this.paymentRepo.create({
      rentalId,
      method: PaymentMethodType.QR_CODE,
      amount: amount.toFixed(2),
      currency: 'VND',
      status: PaymentStatus.PENDING,
      metadata: { qrData },
      payUrl: qrData,
    });
    const saved = await this.paymentRepo.save(payment);
    return { payUrl: qrData, paymentId: saved.id };
  }

  async confirmQrPayment(params: ConfirmQrPaymentParams) {
    const { paymentId, rentalId, amount } = params;
    const payment = paymentId
      ? await this.paymentRepo.findOne({ where: { id: paymentId, rentalId } })
      : await this.paymentRepo.findOne({ where: { rentalId, method: PaymentMethodType.QR_CODE }, order: { createdAt: 'DESC' } });

    if (!payment) {
      throw new BadRequestException('Không tìm thấy payment QR');
    }
    if (payment.status === PaymentStatus.SUCCESS) {
      return { ok: true, message: 'Payment already confirmed' };
    }

    if (payment.amount && amount && Number(payment.amount) !== Number(amount)) {
      throw new BadRequestException('Số tiền không khớp');
    }

    await this.paymentRepo.update(payment.id, {
      status: PaymentStatus.SUCCESS,
      transactionId: 'qr_manual',
      rawResponse: undefined,
    });

    const rental = await this.rentalRepo.findOne({ where: { id: payment.rentalId } });
    if (rental) {
      if (rental.travelPointsUsed && rental.travelPointsUsed > 0) {
        const user = await this.userRepo.findOne({ where: { id: rental.userId } });
        if (user) {
          const deducted = Math.min(user.travelPoint, rental.travelPointsUsed);
          if (deducted > 0) {
            await this.userRepo.update(user.id, { travelPoint: user.travelPoint - deducted });
          }
        }
        await this.rentalRepo.update(rental.id, { travelPointsUsed: 0 });
      }

      await this.rentalRepo.update(payment.rentalId, {
        status: RentalBillStatus.PAID,
        rentalStatus: RentalProgressStatus.BOOKED,
      });
    }

    return { ok: true };
  }

  async handleMomoIpn(payload: MomoIpnPayload) {
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    if (!accessKey || !secretKey) {
      throw new BadRequestException('Thiếu cấu hình MoMo');
    }

    const {
      amount,
      orderId,
      requestId,
      resultCode,
      message,
      transId,
      signature,
    } = payload;

    if (!orderId || !requestId || !signature) {
      throw new BadRequestException('Thiếu orderId/requestId/signature');
    }

    const rawSignature = `accessKey=${accessKey}&amount=${amount ?? ''}&extraData=&message=${message ?? ''}&orderId=${orderId}&orderInfo=&orderType=&partnerCode=${process.env.MOMO_PARTNER_CODE ?? ''}&payType=&requestId=${requestId}&responseTime=&resultCode=${resultCode ?? ''}&transId=${transId ?? ''}`;
    const expected = createHmac('sha256', secretKey).update(rawSignature).digest('hex');
    if (expected !== signature) {
      throw new BadRequestException('Sai chữ ký MoMo');
    }

    const payment = await this.paymentRepo.findOne({ where: { orderId, requestId } });
    if (!payment) {
      throw new BadRequestException('Không tìm thấy payment');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return { ok: true, message: 'Payment already processed' };
    }

    if (resultCode !== 0) {
      const raw: Record<string, unknown> = payload as Record<string, unknown>;
      await this.paymentRepo.update(payment.id, {
        status: PaymentStatus.FAILED,
        rawResponse: raw as any,
        transactionId: transId ? String(transId) : undefined,
      });
      return { ok: true, message: 'Payment failed' };
    }

    const rawOk: Record<string, unknown> = payload as Record<string, unknown>;
    await this.paymentRepo.update(payment.id, {
      status: PaymentStatus.SUCCESS,
      transactionId: transId ? String(transId) : undefined,
      rawResponse: rawOk as any,
    });

    const rental = await this.rentalRepo.findOne({ where: { id: payment.rentalId } });
    if (rental) {
      if (rental.travelPointsUsed && rental.travelPointsUsed > 0) {
        const user = await this.userRepo.findOne({ where: { id: rental.userId } });
        if (user) {
          const deducted = Math.min(user.travelPoint, rental.travelPointsUsed);
          if (deducted > 0) {
            await this.userRepo.update(user.id, { travelPoint: user.travelPoint - deducted });
          }
        }
        await this.rentalRepo.update(rental.id, { travelPointsUsed: 0 });
      }

      await this.rentalRepo.update(payment.rentalId, {
        status: RentalBillStatus.PAID,
        rentalStatus: RentalProgressStatus.BOOKED,
      });
    }

    return { ok: true };
  }

  async refundMomo(paymentId: number) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new BadRequestException('Không tìm thấy payment');
    if (payment.method !== PaymentMethodType.MOMO) {
      throw new BadRequestException('Payment không phải MoMo');
    }
    if (!payment.transactionId || !payment.orderId || !payment.requestId) {
      throw new BadRequestException('Thiếu transactionId/orderId/requestId để refund');
    }

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const refundEndpoint = process.env.MOMO_REFUND_ENDPOINT;
    if (!partnerCode || !accessKey || !secretKey || !refundEndpoint) {
      throw new BadRequestException('Thiếu cấu hình MoMo refund');
    }

    const amount = payment.amount;
    const requestId = `refund_${Date.now()}`;
    const description = `Refund rental ${payment.rentalId}`;
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&description=${description}&orderId=${payment.orderId}&partnerCode=${partnerCode}&requestId=${requestId}&transId=${payment.transactionId}`;
    const signature = createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const body = {
      partnerCode,
      accessKey,
      requestId,
      orderId: payment.orderId,
      amount,
      transId: payment.transactionId,
      description,
      signature,
      lang: 'vi',
    };

    try {
      const res = await axios.post(refundEndpoint, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      await this.paymentRepo.update(payment.id, {
        status: PaymentStatus.REFUNDED,
        rawResponse: res.data,
      });
      return { ok: true, data: res.data };
    } catch (error) {
      this.logger.error('MoMo refund failed', error instanceof Error ? error.stack : undefined);
      throw new BadRequestException('Refund MoMo thất bại');
    }
  }

  async refundLatestByRental(rentalId: number) {
    const payment = await this.paymentRepo.findOne({
      where: { rentalId, status: PaymentStatus.SUCCESS },
      order: { createdAt: 'DESC' },
    });
    if (!payment) {
      return { ok: true, message: 'Không có payment để refund' };
    }
    if (payment.method === PaymentMethodType.MOMO) {
      return this.refundMomo(payment.id);
    }
    // QR: đánh dấu REFUNDED thủ công
    await this.paymentRepo.update(payment.id, { status: PaymentStatus.REFUNDED });
    return { ok: true, message: 'Đánh dấu REFUNDED cho QR' };
  }

  async createPayoutPending(params: CreatePayoutParams) {
    const { rentalId, ownerUserId, amount, bankName, bankAccountNumber, bankAccountName, note } = params;
    if (!bankName || !bankAccountNumber || !bankAccountName) {
      throw new BadRequestException('Thiếu thông tin ngân hàng của chủ xe');
    }
    const payout = this.payoutRepo.create({
      rentalId,
      ownerUserId,
      amount: amount.toFixed(2),
      status: PayoutStatus.PENDING,
      bankName,
      bankAccountNumber,
      bankAccountName,
      note,
    });
    return this.payoutRepo.save(payout);
  }

  async listPayoutsByOwner(ownerUserId: number) {
    return this.payoutRepo.find({ where: { ownerUserId }, order: { createdAt: 'DESC' } });
  }

  async updatePayoutStatus(params: UpdatePayoutStatusParams) {
    const { payoutId, status, note } = params;
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) {
      throw new BadRequestException('Không tìm thấy payout');
    }
    payout.status = status;
    if (note) {
      payout.note = note;
    }
    return this.payoutRepo.save(payout);
  }
}
