import { CreateVisaPaymentDto } from './dto/create-visa-payment.dto';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentMethodType,
  PaymentStatus,
} from './entities/payment.entity';
import { Payout, PayoutStatus } from './entities/payout.entity';
import {
  RentalBill,
  RentalBillStatus,
  RentalProgressStatus,
} from '../rental-bill/entities/rental-bill.entity';
import { User } from '../user/entities/user.entity';
import axios from 'axios';
import { createHmac } from 'crypto';
import { WalletService } from '../wallet/wallet.service';
import { VouchersService } from '../voucher/voucher.service';
import { HotelRoomsService } from '../hotel/room/hotel-room.service';
import { HotelBill, HotelBillStatus } from '../hotel/bill/entities/hotel-bill.entity';
import { BusBill, BusBillStatus } from '../bus/bill/entities/bus-bill.entity';
import { TrainBill, TrainBillStatus } from '../train/bill/entities/train-bill.entity';
import { FlightBill, FlightBillStatus } from '../flight/bill/entities/flight-bill.entity';
import { DeliveryBill, DeliveryBillStatus } from '../delivery/bill/entities/delivery-bill.entity';
import { ServiceType } from './entities/booking-transaction.entity';
import { CooperationPaymentService } from '../cooperation/cooperation-payment.service';
import { Cooperation } from '../cooperation/entities/cooperation.entity';

interface CreateMomoPaymentParams {
  billId: number;
  serviceType: ServiceType;
  amount: number;
}

interface CreateQrPaymentParams {
  billId: number;
  serviceType: ServiceType;
  amount: number;
  qrData: string;
}

interface ConfirmQrPaymentParams {
  paymentId?: number;
  billId: number;
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
  orderInfo?: string;
  orderType?: string;
  payType?: string;
  responseTime?: number;
  partnerCode?: string;
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
    @InjectRepository(HotelBill)
    private readonly hotelBillRepo: Repository<HotelBill>,
    @InjectRepository(BusBill)
    private readonly busBillRepo: Repository<BusBill>,
    @InjectRepository(TrainBill)
    private readonly trainBillRepo: Repository<TrainBill>,
    @InjectRepository(FlightBill)
    private readonly flightBillRepo: Repository<FlightBill>,
    @InjectRepository(DeliveryBill)
    private readonly deliveryBillRepo: Repository<DeliveryBill>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    private readonly walletService: WalletService,
    private readonly vouchersService: VouchersService,
    private readonly cooperationPaymentService: CooperationPaymentService,
    private readonly hotelRoomsService: HotelRoomsService,
  ) {}

  get repo() {
    return this.paymentRepo;
  }

  async createVisaPayment(
    dto: CreateVisaPaymentDto,
  ): Promise<{ ok: boolean; paymentId: number; message: string }> {
    const { rentalId, amount, cardNumber, cardHolderName } = dto;
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) {
      throw new BadRequestException(`Không tìm thấy rental ${rentalId}`);
    }

    // Mock processing - assume always success
    const orderId = `visa_${rentalId}_${Date.now()}`;
    const transactionId = `trans_${Date.now()}`;

    const payment = this.paymentRepo.create({
      rentalId: rental.id,
      method: PaymentMethodType.VISA,
      amount: amount.toFixed(2),
      currency: 'VND', // or USD if converted
      status: PaymentStatus.SUCCESS,
      orderId,
      transactionId,
      metadata: {
        cardHolderName: cardHolderName.toUpperCase(),
        maskedCard: `**** **** **** ${cardNumber.slice(-4)}`,
        note: 'Mock Visa Payment Success',
      },
    });
    const saved = await this.paymentRepo.save(payment);

    // Perform post-payment logic (Escrow, Points, Voucher, Update Bill)
    this.logger.log(
      `Processing successful Visa payment for rentalId: ${rental.id}`,
    );

    // 1. Wallet escrow
    try {
      const amountNum = amount;
      if (amountNum > 0) {
        // For Visa, we deposit "fresh money" into user wallet then lock it
        await this.walletService.deposit(
          rental.userId,
          amountNum,
          `visa:${saved.id}`,
        );
        await this.walletService.lockFunds(
          rental.userId,
          amountNum,
          `rental:${rental.id}`,
        );
        this.logger.log(
          `Successfully escrowed ${amountNum} for rental ${rental.id} (Visa)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to escrow funds for Visa rental ${rental.id}: ${err.message}`,
      );
      // In real world, we might refund here. For mock, we just log.
    }

    // 2. Travel Points deduction
    if (rental.travelPointsUsed && rental.travelPointsUsed > 0) {
      const user = await this.userRepo.findOne({
        where: { id: rental.userId },
      });
      if (user) {
        const deducted = Math.min(user.travelPoint, rental.travelPointsUsed);
        if (deducted > 0) {
          await this.userRepo.decrement(
            { id: user.id },
            'travelPoint',
            deducted,
          );
          this.logger.log(
            `Deducted ${deducted} points from user ${user.id} (Visa)`,
          );
        }
      }
    }

    // 3. Voucher Usage
    if (rental.voucherId) {
      await this.vouchersService.incrementUsage(rental.voucherId);
    }

    // 4. Update Bill Status
    await this.rentalRepo.update(rental.id, {
      status: RentalBillStatus.PAID,
      rentalStatus: RentalProgressStatus.BOOKED,
    });

    return {
      ok: true,
      paymentId: saved.id,
      message: 'Thanh toán Visa thành công',
    };
  }

  async createMomoPayment(
    params: CreateMomoPaymentParams,
  ): Promise<{ payUrl: string; paymentId: number }> {
    const { billId, serviceType, amount } = params;
    
    let billCode = '';
    switch (serviceType) {
      case ServiceType.RENTAL:
        const rental = await this.rentalRepo.findOne({ where: { id: billId } });
        if (!rental) throw new BadRequestException(`Không tìm thấy rental ${billId}`);
        billCode = rental.code;
        break;
      case ServiceType.HOTEL:
        const hotelBill = await this.hotelBillRepo.findOne({ where: { id: billId } });
        if (!hotelBill) throw new BadRequestException(`Không tìm thấy hotel bill ${billId}`);
        billCode = hotelBill.code;
        break;
      case ServiceType.BUS:
        const busBill = await this.busBillRepo.findOne({ where: { id: billId } });
        if (!busBill) throw new BadRequestException(`Không tìm thấy bus bill ${billId}`);
        billCode = busBill.code;
        break;
      case ServiceType.TRAIN:
        const trainBill = await this.trainBillRepo.findOne({ where: { id: billId } });
        if (!trainBill) throw new BadRequestException(`Không tìm thấy train bill ${billId}`);
        billCode = trainBill.code;
        break;
      case ServiceType.FLIGHT:
        const flightBill = await this.flightBillRepo.findOne({ where: { id: billId } });
        if (!flightBill) throw new BadRequestException(`Không tìm thấy flight bill ${billId}`);
        billCode = flightBill.code;
        break;
      case ServiceType.DELIVERY:
        const deliveryBill = await this.deliveryBillRepo.findOne({ where: { id: billId } });
        if (!deliveryBill) throw new BadRequestException(`Không tìm thấy delivery bill ${billId}`);
        billCode = deliveryBill.code;
        break;
      default:
        throw new BadRequestException(`ServiceType ${serviceType} chưa được hỗ trợ MoMo`);
    }

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const endpoint = process.env.MOMO_ENDPOINT;
    const ipnUrl = process.env.MOMO_IPN_URL;
    
    const redirectUrl = process.env.FRONTEND_RETURN_URL || 'https://localhost';

    if (!partnerCode || !accessKey || !secretKey || !endpoint || !ipnUrl) {
      throw new BadRequestException(
        'Thiếu cấu hình MoMo (partnerCode/accessKey/secretKey/endpoint/ipnUrl)',
      );
    }

    const orderId = `${serviceType.toLowerCase()}_${billId}_${Date.now()}`;
    const requestId = `${Date.now()}`;
    const orderInfo = `${serviceType} ${billCode}`;
    const rawAmount = amount.toFixed(0);

    const rawSignature = `accessKey=${accessKey}&amount=${rawAmount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
    const signature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

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
      billId,
      serviceType,
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
      await this.paymentRepo.update(saved.id, {
        payUrl,
        rawResponse: res.data,
      });
      if (!payUrl) {
        throw new Error('MoMo trả về thiếu payUrl');
      }
      return { payUrl, paymentId: saved.id };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `MoMo createPayment failed with data: ${JSON.stringify(error.response.data)}`,
        );
      } else {
        this.logger.error(
          'MoMo createPayment failed',
          error instanceof Error ? error.stack : undefined,
        );
      }
      const raw: Record<string, unknown> | undefined =
        error instanceof Error ? { message: error.message } : undefined;
      await this.paymentRepo.update(saved.id, {
        status: PaymentStatus.FAILED,
        rawResponse: raw as any,
      });
      throw new BadRequestException('Tạo yêu cầu thanh toán MoMo thất bại');
    }
  }

  async createQrPayment(
    params: CreateQrPaymentParams,
  ): Promise<{ payUrl: string; paymentId: number }> {
    const { billId, serviceType, amount, qrData } = params;
    const payment = this.paymentRepo.create({
      billId,
      serviceType,
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
    const { paymentId, billId, amount } = params;
    const payment = paymentId
      ? await this.paymentRepo.findOne({ where: { id: paymentId } })
      : await this.paymentRepo.findOne({
          where: { billId, method: PaymentMethodType.QR_CODE },
          order: { createdAt: 'DESC' },
        });

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

    await this.processSuccessfulPayment(payment, 'qr_manual');

    return { ok: true };
  }

  async handleMomoIpn(payload: MomoIpnPayload) {
    this.logger.log(`Received MoMo IPN: ${JSON.stringify(payload)}`);
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    if (!accessKey || !secretKey) {
      this.logger.error('MOMO_ACCESS_KEY or MOMO_SECRET_KEY missing in env');
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
      orderInfo,
      orderType,
      payType,
      responseTime,
      extraData,
    } = payload;

    if (!orderId || !requestId || !signature) {
      this.logger.warn(
        `Missing required fields in IPN payload: orderId=${orderId}, requestId=${requestId}`,
      );
      throw new BadRequestException('Thiếu orderId/requestId/signature');
    }

    const rawSignature = `accessKey=${accessKey}&amount=${amount ?? ''}&extraData=${extraData ?? ''}&message=${message ?? ''}&orderId=${orderId}&orderInfo=${orderInfo ?? ''}&orderType=${orderType ?? ''}&partnerCode=${payload.partnerCode ?? ''}&payType=${payType ?? ''}&requestId=${requestId}&responseTime=${responseTime ?? ''}&resultCode=${resultCode ?? ''}&transId=${transId ?? ''}`;
    const expected = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    if (expected !== signature) {
      this.logger.error(
        `Signature mismatch! Expected: ${expected}, Received: ${signature}`,
      );
      throw new BadRequestException('Sai chữ ký MoMo');
    }

    this.logger.log(`Signature verified for orderId: ${orderId}`);

    return this.finishMomoPayment(payload);
  }

  async finishMomoPayment(payload: MomoIpnPayload) {
    const { orderId, requestId, resultCode, transId } = payload;
    if (!orderId) throw new BadRequestException('MoMo payload missing orderId');
    
    const payment = await this.paymentRepo.findOne({
      where: { orderId, requestId },
    });
    if (!payment) {
      this.logger.error(
        `Payment record not found for orderId: ${orderId}, requestId: ${requestId}`,
      );
      throw new BadRequestException('Không tìm thấy payment');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.warn(`Payment ${payment.id} already processed successfully`);
      return { ok: true, message: 'Payment already processed' };
    }

    if (resultCode != 0) {
      this.logger.warn(
        `MoMo payment failed with resultCode ${resultCode}`,
      );
      await this.paymentRepo.update(payment.id, {
        status: PaymentStatus.FAILED,
        rawResponse: payload as any,
        transactionId: transId ? String(transId) : undefined,
      });
      return { ok: false, message: 'Payment failed' };
    }

    this.logger.log(
      `Processing successful payment for service: ${payment.serviceType}, billId: ${payment.billId}`,
    );

    await this.paymentRepo.update(payment.id, {
      status: PaymentStatus.SUCCESS,
      transactionId: transId ? String(transId) : undefined,
      rawResponse: payload as any,
    });

    await this.processSuccessfulPayment(payment, transId ? String(transId) : orderId);

    return { ok: true };
  }

  private async processSuccessfulPayment(payment: Payment, transactionId: string) {
    const { serviceType, billId } = payment;
    if (!serviceType || !billId) {
      this.logger.error(`Payment ${payment.id} missing serviceType or billId`);
      return;
    }
    const amountNum = parseFloat(payment.amount);

    switch (serviceType) {
      case ServiceType.RENTAL:
        await this.processRentalPayment(billId, amountNum, transactionId);
        break;
      case ServiceType.HOTEL:
        await this.processHotelPayment(billId, transactionId);
        break;
      case ServiceType.BUS:
        await this.processBusPayment(billId, transactionId);
        break;
      case ServiceType.TRAIN:
        await this.processTrainPayment(billId, transactionId);
        break;
      case ServiceType.FLIGHT:
        await this.processFlightPayment(billId, transactionId);
        break;
      case ServiceType.DELIVERY:
        await this.processDeliveryPayment(billId, transactionId);
        break;
      default:
        this.logger.warn(`Post-payment logic not implemented for service ${serviceType}`);
    }
  }

  private async processRentalPayment(billId: number, amount: number, transactionId: string) {
    const rental = await this.rentalRepo.findOne({ where: { id: billId } });
    if (!rental) return;

    // 1. Wallet escrow: Deposit and Lock
    if (amount > 0) {
      await this.walletService.deposit(rental.userId, amount, `payment:${transactionId}`);
      await this.walletService.lockFunds(rental.userId, amount, `rental:${rental.id}`);
    }

    // 2. Travel Points
    if (rental.travelPointsUsed > 0) {
      await this.userRepo.decrement({ id: rental.userId }, 'travelPoint', rental.travelPointsUsed);
    }

    // 3. Voucher
    if (rental.voucherId) {
      await this.vouchersService.incrementUsage(rental.voucherId);
    }

    // 4. Update Bill
    await this.rentalRepo.update(rental.id, {
      status: RentalBillStatus.PAID,
      rentalStatus: RentalProgressStatus.BOOKED,
    });
  }

  private async processHotelPayment(billId: number, transactionId: string) {
    const bill = await this.hotelBillRepo.findOne({ 
      where: { id: billId },
      relations: ['user', 'cooperation', 'cooperation.manager', 'details', 'details.room']
    });
    if (!bill) return;

    bill.status = HotelBillStatus.PAID;

    // Log split and deposit to partner
    try {
      const tx = await this.cooperationPaymentService.logTransaction({
        cooperationId: bill.cooperation.id,
        userId: bill.user.id,
        serviceType: ServiceType.HOTEL,
        bookingId: bill.code,
        totalAmount: parseFloat(bill.total),
      });
      if (tx && bill.cooperation?.manager?.id) {
        const partnerAmount = parseFloat(tx.partnerAmount);
        if (partnerAmount > 0) {
          await this.walletService.deposit(bill.cooperation.manager.id, partnerAmount, `REVENUE_HOTEL_${bill.code}`);
        }
      }
    } catch (e) {
      this.logger.error(`Failed to process hotel revenue for bill ${bill.id}`, e);
    }

    if (bill.voucher) {
       await this.vouchersService.incrementUsage(bill.voucher.id);
    }

    // Ensure room availability (reservation)
    for (const detail of bill.details) {
      await this.hotelRoomsService.ensureRoomAvailability(
        detail.room,
        bill.checkInDate,
        bill.checkOutDate,
        1,
        bill.id,
      );
    }

    await this.hotelBillRepo.save(bill);
  }

  private async processBusPayment(billId: number, transactionId: string) {
    const bill = await this.busBillRepo.findOne({ 
      where: { id: billId },
      relations: ['user', 'cooperation', 'cooperation.manager', 'busType', 'busType.cooperation', 'busType.cooperation.manager']
    });
    if (!bill) return;

    bill.status = BusBillStatus.PAID;
    const busCoopId = bill.busType?.cooperation?.id || bill.cooperation?.id;
    const ownerUserId = bill.cooperation?.manager?.id || bill.busType?.cooperation?.manager?.id;

    if (busCoopId) {
      try {
        const tx = await this.cooperationPaymentService.logTransaction({
          cooperationId: busCoopId,
          userId: bill.user.id,
          serviceType: ServiceType.BUS,
          bookingId: bill.code,
          totalAmount: parseFloat(bill.total),
        });
        if (tx && ownerUserId) {
          const partnerAmount = parseFloat(tx.partnerAmount);
          if (partnerAmount > 0) {
            await this.walletService.deposit(ownerUserId, partnerAmount, `REVENUE_BUS_${bill.code}`);
          }
        }
      } catch (e) {
        this.logger.error(`Failed to process bus revenue for bill ${bill.id}`, e);
      }
    }

    if (bill.travelPointsUsed > 0) {
      await this.userRepo.decrement({ id: bill.user.id }, 'travelPoint', bill.travelPointsUsed);
    }
    if (bill.voucher) {
      await this.vouchersService.incrementUsage(bill.voucher.id);
    }
    await this.busBillRepo.save(bill);
  }

  private async processTrainPayment(billId: number, transactionId: string) {
    const bill = await this.trainBillRepo.findOne({ 
      where: { id: billId },
      relations: ['user', 'cooperation', 'cooperation.manager', 'route', 'route.cooperation', 'route.cooperation.manager']
    });
    if (!bill) return;

    bill.status = TrainBillStatus.PAID;
    const trainCoopId = bill.route?.cooperation?.id || bill.cooperation?.id;
    const ownerUserId = bill.cooperation?.manager?.id || bill.route?.cooperation?.manager?.id;

    if (trainCoopId) {
      try {
        const tx = await this.cooperationPaymentService.logTransaction({
          cooperationId: trainCoopId,
          userId: bill.user.id,
          serviceType: ServiceType.TRAIN,
          bookingId: bill.code,
          totalAmount: parseFloat(bill.total),
        });
        if (tx && ownerUserId) {
          const partnerAmount = parseFloat(tx.partnerAmount);
          if (partnerAmount > 0) {
            await this.walletService.deposit(ownerUserId, partnerAmount, `REVENUE_TRAIN_${bill.code}`);
          }
        }
      } catch (e) {
        this.logger.error(`Failed to process train revenue for bill ${bill.id}`, e);
      }
    }

    if (bill.travelPointsUsed > 0) {
      await this.userRepo.decrement({ id: bill.user.id }, 'travelPoint', bill.travelPointsUsed);
    }
    if (bill.voucher) {
      await this.vouchersService.incrementUsage(bill.voucher.id);
    }
    await this.trainBillRepo.save(bill);
  }

  private async processFlightPayment(billId: number, transactionId: string) {
    const bill = await this.flightBillRepo.findOne({ 
      where: { id: billId },
      relations: ['user', 'cooperation', 'cooperation.manager', 'flight', 'flight.cooperation', 'flight.cooperation.manager']
    });
    if (!bill) return;

    bill.status = FlightBillStatus.PAID;
    const flightCoopId = bill.flight?.cooperation?.id || bill.cooperation?.id;
    const ownerUserId = bill.cooperation?.manager?.id || bill.flight?.cooperation?.manager?.id;

    if (flightCoopId) {
      try {
        const tx = await this.cooperationPaymentService.logTransaction({
          cooperationId: flightCoopId,
          userId: bill.user.id,
          serviceType: ServiceType.FLIGHT,
          bookingId: bill.code,
          totalAmount: parseFloat(bill.total),
        });
        if (tx && ownerUserId) {
          const partnerAmount = parseFloat(tx.partnerAmount);
          if (partnerAmount > 0) {
            await this.walletService.deposit(ownerUserId, partnerAmount, `REVENUE_FLIGHT_${bill.code}`);
          }
        }
      } catch (e) {
        this.logger.error(`Failed to process flight revenue for bill ${bill.id}`, e);
      }
    }

    if (bill.travelPointsUsed > 0) {
      await this.userRepo.decrement({ id: bill.user.id }, 'travelPoint', bill.travelPointsUsed);
    }
    if (bill.voucher) {
      await this.vouchersService.incrementUsage(bill.voucher.id);
    }
    await this.flightBillRepo.save(bill);
  }

  private async processDeliveryPayment(billId: number, transactionId: string) {
    const bill = await this.deliveryBillRepo.findOne({ 
      where: { id: billId },
      relations: ['user', 'cooperation', 'cooperation.manager', 'vehicle', 'vehicle.cooperation', 'vehicle.cooperation.manager']
    });
    if (!bill) return;

    bill.status = DeliveryBillStatus.PAID;
    const deliveryCoopId = bill.vehicle?.cooperation?.id || bill.cooperation?.id;
    const ownerUserId = bill.cooperation?.manager?.id || bill.vehicle?.cooperation?.manager?.id;

    if (deliveryCoopId) {
      try {
        const tx = await this.cooperationPaymentService.logTransaction({
          cooperationId: deliveryCoopId,
          userId: bill.user.id,
          serviceType: ServiceType.DELIVERY,
          bookingId: bill.code,
          totalAmount: parseFloat(bill.total),
        });
        if (tx && ownerUserId) {
          const partnerAmount = parseFloat(tx.partnerAmount);
          if (partnerAmount > 0) {
            await this.walletService.deposit(ownerUserId, partnerAmount, `REVENUE_DELIVERY_${bill.code}`);
          }
        }
      } catch (e) {
        this.logger.error(`Failed to process delivery revenue for bill ${bill.id}`, e);
      }
    }

    if (bill.travelPointsUsed > 0) {
      await this.userRepo.decrement({ id: bill.user.id }, 'travelPoint', bill.travelPointsUsed);
    }
    if (bill.voucher) {
      await this.vouchersService.incrementUsage(bill.voucher.id);
    }
    await this.deliveryBillRepo.save(bill);
  }

  verifyMomoSignature(payload: MomoIpnPayload): boolean {
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    if (!accessKey || !secretKey) return false;

    const {
      amount,
      orderId,
      requestId,
      resultCode,
      message,
      transId,
      signature,
      orderInfo,
      orderType,
      payType,
      responseTime,
      extraData,
    } = payload;

    const rawSignature = `accessKey=${accessKey}&amount=${amount ?? ''}&extraData=${extraData ?? ''}&message=${message ?? ''}&orderId=${orderId}&orderInfo=${orderInfo ?? ''}&orderType=${orderType ?? ''}&partnerCode=${payload.partnerCode ?? ''}&payType=${payType ?? ''}&requestId=${requestId}&responseTime=${responseTime ?? ''}&resultCode=${resultCode ?? ''}&transId=${transId ?? ''}`;
    const expected = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    return expected === signature;
  }

  async refundMomo(paymentId: number) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new BadRequestException('Không tìm thấy payment');
    if (payment.method !== PaymentMethodType.MOMO) {
      throw new BadRequestException('Payment không phải MoMo');
    }
    if (!payment.transactionId || !payment.orderId || !payment.requestId) {
      throw new BadRequestException(
        'Thiếu transactionId/orderId/requestId để refund',
      );
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
    const signature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

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
      this.logger.error(
        'MoMo refund failed',
        error instanceof Error ? error.stack : undefined,
      );
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
    if (payment.method === PaymentMethodType.VISA) {
      // Mock refund for Visa
      await this.paymentRepo.update(payment.id, {
        status: PaymentStatus.REFUNDED,
      });
      return { ok: true, message: 'Đã hoàn tiền vào thẻ VISA (Mock)' };
    }
    // QR: đánh dấu REFUNDED thủ công
    await this.paymentRepo.update(payment.id, {
      status: PaymentStatus.REFUNDED,
    });
    return { ok: true, message: 'Đánh dấu REFUNDED cho QR' };
  }

  async createPayoutPending(params: CreatePayoutParams) {
    const {
      rentalId,
      ownerUserId,
      amount,
      bankName,
      bankAccountNumber,
      bankAccountName,
      note,
    } = params;
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
    return this.payoutRepo.find({
      where: { ownerUserId },
      order: { createdAt: 'DESC' },
    });
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
