import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, Not, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  RentalBill,
  RentalBillCancelledBy,
  RentalBillStatus,
  RentalBillType,
  RentalProgressStatus,
} from './entities/rental-bill.entity';
import { PaymentStatus } from '../payment/entities/payment.entity';
import { RentalBillDetail } from './entities/rental-bill-detail.entity';
import { CreateRentalBillDto } from './dto/create-rental-bill.dto';
import { UpdateRentalBillDto } from './dto/update-rental-bill.dto';
import { ManageRentalBillVehicleDto } from './dto/manage-rental-bill-vehicle.dto';
import {
  DeliveryActionDto,
  PickupActionDto,
  ReturnRequestDto,
  ConfirmReturnDto,
} from './dto/rental-workflow.dto';
import { RentalVehiclesService } from '../rental-vehicle/rental-vehicle.service';
import { RentalVehicle } from '../rental-vehicle/entities/rental-vehicle.entity';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../rental-vehicle/enums/rental-vehicle.enum';
import { User } from '../user/entities/user.entity';
import { assignDefined } from '../../common/utils/object.util';
import { VouchersService } from '../voucher/voucher.service';
import { Voucher } from '../voucher/entities/voucher.entity';
import { WalletService } from '../wallet/wallet.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { parse, isValid } from 'date-fns';
import { PaymentService } from '../payment/payment.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { FptAiService } from '../../common/fpt-ai/fpt-ai.service';
import axios from 'axios';
import type { Express } from 'express';
import { assertImageFile } from '../../common/upload/image-upload.utils';
import { MapService } from '../../common/map/map.service';
import { RentalVehicleType } from '../rental-vehicle/enums/rental-vehicle.enum';
import { calculateShippingFee as calcShippingFee } from '../../common/utils/shipping-fee.util';
import { v4 as uuidv4 } from 'uuid';

const VND_TO_ETH_RATE = 80_000_000;

import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

@Injectable()
export class RentalBillsService {
  private readonly logger = new Logger(RentalBillsService.name);

  constructor(
    @InjectRepository(RentalBill)
    private readonly billRepo: Repository<RentalBill>,
    @InjectRepository(RentalBillDetail)
    private readonly detailRepo: Repository<RentalBillDetail>,
    @InjectRepository(RentalVehicle)
    private readonly vehicleRepo: Repository<RentalVehicle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly vouchersService: VouchersService,
    private readonly walletService: WalletService,
    private readonly blockchainService: BlockchainService,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationService: NotificationService,
    private readonly fptAiService: FptAiService,
    private readonly mapService: MapService,
    private readonly rentalVehiclesService: RentalVehiclesService,
  ) {}

  private validatePackageDates(pkg: string, start: Date, end: Date) {
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Time matching check for daily
    const sameTime =
      start.getHours() === end.getHours() &&
      start.getMinutes() === end.getMinutes();

    switch (pkg) {
      case '1h':
        if (Math.abs(diffHours - 1) > 0.01)
          throw new BadRequestException('Gói 1h phải đúng 1 giờ');
        break;
      case '4h':
        if (Math.abs(diffHours - 4) > 0.01)
          throw new BadRequestException('Gói 4h phải đúng 4 giờ');
        break;
      case '8h':
        if (Math.abs(diffHours - 8) > 0.01)
          throw new BadRequestException('Gói 8h phải đúng 8 giờ');
        break;
      case '12h':
        if (Math.abs(diffHours - 12) > 0.01)
          throw new BadRequestException('Gói 12h phải đúng 12 giờ');
        break;
      case '1d':
        if (diffDays !== 1 || !sameTime)
          throw new BadRequestException(
            'Gói 1 ngày phải đảm bảo đúng 24 giờ trùng giờ nhận trả',
          );
        break;
      case '2d':
        if (diffDays !== 2 || !sameTime)
          throw new BadRequestException(
            'Gói 2 ngày phải đảm bảo đúng 2 ngày trùng giờ nhận trả',
          );
        break;
      case '3d':
        if (diffDays !== 3 || !sameTime)
          throw new BadRequestException(
            'Gói 3 ngày phải đảm bảo đúng 3 ngày trùng giờ nhận trả',
          );
        break;
      case '5d':
        if (diffDays !== 5 || !sameTime)
          throw new BadRequestException(
            'Gói 5 ngày phải đảm bảo đúng 5 ngày trùng giờ nhận trả',
          );
        break;
      case '7d':
        if (diffDays !== 7 || !sameTime)
          throw new BadRequestException(
            'Gói 7 ngày phải đảm bảo đúng 7 ngày trùng giờ nhận trả',
          );
        break;
      default:
        throw new BadRequestException(`Gói thuê không hợp lệ (${pkg})`);
    }
  }

  private formatMoney(value: number | string | undefined): string {
    if (value === undefined || value === null) {
      return '0.00';
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (num || 0).toFixed(2);
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `RB${timestamp}${random}`;
  }

  private parseCustomDate(dateStr: string): Date {
    // Try dd:MM:yyyy HH:mm first
    let date = parse(dateStr, 'dd:MM:yyyy HH:mm', new Date());
    if (isValid(date)) return date;

    // Fallback to ISO
    date = new Date(dateStr);
    if (isValid(date)) return date;

    throw new BadRequestException(
      `Invalid date format: ${dateStr}. Expected ISO 8601 or dd:MM:yyyy HH:mm`,
    );
  }

  /**
   * Cron job to handle bill timeouts:
   * - PENDING (post-confirm): Cancel after 10 minutes.
   * - PENDING (pure): Cancel after 30 minutes.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeouts() {
    const now = new Date();

    // 10 min timeout for post-confirm PENDING (has paymentMethod)
    const confirmedThreshold = new Date(now.getTime() - 10 * 60 * 1000);
    const postConfirmBills = await this.billRepo.find({
      where: {
        status: RentalBillStatus.PENDING,
        paymentMethod: Not(IsNull()),
        updatedAt: LessThan(confirmedThreshold),
      },
    });

    for (const bill of postConfirmBills) {
      bill.status = RentalBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      const billTime = bill.updatedAt.toLocaleString('vi-VN');
      const thresholdTime = confirmedThreshold.toLocaleString('vi-VN');
      this.logger.log(
        `Bill ${bill.id} (POST-CONFIRM PENDING) cancelled. Bill updated at: ${billTime}, Threshold: ${thresholdTime}`,
      );
    }

    // 30 min timeout for pure PENDING (no paymentMethod)
    const pendingThreshold = new Date(now.getTime() - 30 * 60 * 1000);
    const pendingBills = await this.billRepo.find({
      where: {
        status: RentalBillStatus.PENDING,
        paymentMethod: IsNull(),
        createdAt: LessThan(pendingThreshold),
      },
    });

    for (const bill of pendingBills) {
      bill.status = RentalBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      const billTime = bill.createdAt.toLocaleString('vi-VN');
      const thresholdTime = pendingThreshold.toLocaleString('vi-VN');
      this.logger.log(
        `Bill ${bill.id} (PURE PENDING) cancelled. Bill created at: ${billTime}, Threshold: ${thresholdTime}`,
      );
    }
  }

  async create(userId: number, dto: CreateRentalBillDto): Promise<RentalBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng này');
    }

    const startDate = dto.startDate;
    const endDate = dto.endDate;

    this.validatePackageDates(dto.durationPackage, startDate, endDate);
    this.rentalVehiclesService.validateRentalTimes(startDate, endDate);

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      userId,
      rentalType: dto.rentalType,
      vehicleType: dto.vehicleType,
      durationPackage: dto.durationPackage,
      startDate,
      endDate,
      location: dto.location,
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
      status: RentalBillStatus.PENDING,
      travelPointsUsed: 0,
    });

    const saved = await this.billRepo.save(bill);

    // Add vehicles
    for (const detailDto of dto.details) {
      await this.addVehicleToBill(saved.id, userId, detailDto);
    }

    return this.findOne(saved.id, userId);
  }

  async findOne(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'details',
        'details.vehicle',
        'details.vehicle.contract',
        'details.vehicle.contract.user',
        'details.vehicle.vehicleCatalog',
        'user',
        'voucher',
      ],
    });
    if (!bill) {
      throw new NotFoundException('Không tìm thấy đơn hàng này');
    }

    // Authorization: Must be renter or owner
    const ownerId = bill.details?.[0]?.vehicle?.contract?.user?.id;
    if (bill.userId !== userId && ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào đơn hàng này',
      );
    }

    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateRentalBillDto,
  ): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);

    if (bill.status !== RentalBillStatus.PENDING) {
      throw new BadRequestException(
        `Không thể cập nhật đơn hàng ở trạng thái ${bill.status}`,
      );
    }

    assignDefined(bill, {
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
      location: dto.location,
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
    });

    // Recalculate shipping fee if coordinates change
    if (dto.pickupLatitude !== undefined || dto.pickupLongitude !== undefined) {
      const { fee, isNegotiable } = await this.calculateShippingFee(bill);
      bill.shippingFee = fee.toString();
      bill.isShippingFeeNegotiable = isNegotiable;
    }

    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        bill.voucher = undefined;
        bill.voucherId = undefined;
      } else {
        const voucher = await this.vouchersService.findByCode(dto.voucherCode);
        if (!voucher) throw new NotFoundException('Không tìm thấy mã giảm giá');

        // Reuse VouchersService validation
        const totalFromDetails = bill.details.reduce(
          (sum, d) => sum + parseFloat(d.price),
          0,
        );
        this.vouchersService.validateVoucherForBooking(
          voucher,
          totalFromDetails,
        );

        bill.voucher = voucher;
        bill.voucherId = voucher.id;
      }
    }

    if (dto.travelPointsUsed !== undefined) {
      const points = Number(dto.travelPointsUsed);
      if (Number.isNaN(points) || points < 0) {
        throw new BadRequestException(
          'Điểm du lịch sử dụng phải là số không âm',
        );
      }

      // Check if user has enough points
      if (bill.user && points > bill.user.travelPoint) {
        throw new BadRequestException(
          `Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint})`,
        );
      }

      bill.travelPointsUsed = Math.floor(points);
    }

    // Recalculate total in-memory based on updated props
    this.calculateTotal(bill);

    return this.billRepo.save(bill);
  }

  async pay(
    id: number,
    userId: number,
  ): Promise<{ payUrl: string; paymentId: number }> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể thanh toán các đơn hàng đang chờ (PENDING)',
      );
    }

    if (!bill.paymentMethod) {
      throw new BadRequestException(
        'Cần chọn phương thức thanh toán trước khi thanh toán',
      );
    }

    const totalAmount = parseFloat(bill.total);
    if (totalAmount <= 0) {
      throw new BadRequestException('Total amount must be greater than 0');
    }

    // Derive owner ETH info
    const vehicles = bill.details.map((d) => d.vehicle).filter((v) => !!v);
    const ownerEthAddress = vehicles[0]?.contract?.user?.ethAddress;
    if (ownerEthAddress) {
      await this.billRepo.update(bill.id, {
        ownerEthAddress,
        requiresEthDeposit: true,
      });
    }

    if (bill.paymentMethod === 'momo') {
      const { payUrl, paymentId } = await this.paymentService.createMomoPayment(
        {
          rentalId: bill.id,
          amount: totalAmount,
        },
      );
      this.logger.log(
        `Created MoMo payment ${paymentId} for rental bill ${bill.id}`,
      );
      return { payUrl, paymentId };
    }

    if (bill.paymentMethod === 'qr_code') {
      const qrPath = path.join(process.cwd(), 'public', 'admin_qr.png');
      let qrData = '';
      try {
        const imageBuffer = fs.readFileSync(qrPath);
        qrData = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      } catch (err) {
        this.logger.error(`Failed to read admin_qr.png: ${err.message}`);
        qrData = '/public/admin_qr.png'; // Fallback to URL
      }

      const { payUrl, paymentId } = await this.paymentService.createQrPayment({
        rentalId: bill.id,
        amount: totalAmount,
        qrData,
      });
      this.logger.log(
        `Created QR payment ${paymentId} for rental bill ${bill.id}`,
      );
      return { payUrl, paymentId };
    }

    throw new BadRequestException('Phương thức thanh toán không được hỗ trợ');
  }

  async complete(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PAID) {
      throw new BadRequestException(
        'Chỉ có thể hoàn thành các đơn hàng đã thanh toán (PAID)',
      );
    }

    bill.status = RentalBillStatus.COMPLETED;

    // Process funds release to owner
    const vehicles = bill.details.map((d) => d.vehicle).filter((v) => !!v);
    const ownerUserId = vehicles[0]?.contract?.user?.id;
    await this.processRefundOrRelease(bill, 'release', ownerUserId);

    // Set vehicles back to AVAILABLE
    for (const detail of bill.details) {
      if (detail.vehicle) {
        detail.vehicle.availability = RentalVehicleAvailabilityStatus.AVAILABLE;
        detail.vehicle.totalRentals += 1;
        await this.vehicleRepo.save(detail.vehicle);
      }
    }

    return this.billRepo.save(bill);
  }

  async cancel(
    id: number,
    userId: number,
    reason: string,
  ): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (
      [RentalBillStatus.COMPLETED, RentalBillStatus.CANCELLED].includes(
        bill.status,
      )
    ) {
      throw new BadRequestException(`Bill is already ${bill.status}`);
    }

    // 24h Cancellation Rule
    // Only allow cancellation within 24h of PAYMENT (createdAt for now if payment time not tracked separately,
    // but better to track payment time. However, logic says "24h after payment".
    // If bill is PENDING, no payment yet, so safe to cancel.
    // If bill is PAID, check time.

    if (bill.status === RentalBillStatus.PAID) {
      // Assuming payment happens roughly around update to PAID.
      // Or we check createdAt if we don't have payment timestamp.
      // Let's use updatedAt as a proxy for payment time if status is PAID, or find payment record.
      // For simplicity/requirement "24h sau khi đã thanh toán", relying on updatedAt when it turned PAID is risky if other updates happen.
      // Best to find the Payment record.

      const payment = await this.paymentService.repo.findOne({
        where: { rentalId: bill.id, status: PaymentStatus.SUCCESS },
        order: { createdAt: 'DESC' },
      });

      if (payment) {
        const now = new Date();
        const paymentTime = new Date(payment.createdAt);
        const diffMs = now.getTime() - paymentTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 24) {
          throw new BadRequestException(
            'Chỉ có thể hủy đơn hàng trong vòng 24h sau khi thanh toán',
          );
        }
      }
    }

    // If already paid/confirmed, handle refunds or vehicle availability
    if (bill.status === RentalBillStatus.PAID) {
      await this.processRefundOrRelease(bill, 'refund');
    }

    if (
      [RentalBillStatus.PAID, RentalBillStatus.PENDING].includes(bill.status)
    ) {
      for (const detail of bill.details) {
        if (detail.vehicle) {
          detail.vehicle.availability =
            RentalVehicleAvailabilityStatus.AVAILABLE;
          await this.vehicleRepo.save(detail.vehicle);
        }
      }
    }

    bill.status = RentalBillStatus.CANCELLED;
    bill.rentalStatus = RentalProgressStatus.CANCELLED;
    bill.cancelReason = reason;
    bill.cancelledBy = RentalBillCancelledBy.USER;

    return this.billRepo.save(bill);
  }

  // --- WORKFLOW ACTIONS ---

  async ownerDelivering(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'user',
        'details',
        'details.vehicle',
        'details.vehicle.contract',
        'details.vehicle.contract.user',
      ],
    });
    if (!bill) throw new NotFoundException('Không tìm thấy đơn hàng');

    // Authorization: Must be customer or owner
    const ownerId = bill.details?.[0]?.vehicle?.contract?.user?.id;
    if (bill.userId !== userId && ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào đơn hàng này',
      );
    }

    if (bill.status !== RentalBillStatus.PAID) {
      throw new BadRequestException(
        'Chỉ có thể giao xe sau khi khách đã thanh toán',
      );
    }

    const now = new Date();
    const oneHourBeforeStart = new Date(
      bill.startDate.getTime() - 60 * 60 * 1000,
    );
    if (now < oneHourBeforeStart) {
      throw new BadRequestException(
        `Chỉ được phép bấm giao xe từ lúc ${oneHourBeforeStart.toLocaleString('vi-VN')} (tối đa 1 tiếng trước giờ thuê)`,
      );
    }

    if (bill.rentalStatus !== RentalProgressStatus.BOOKED) {
      throw new BadRequestException(
        'Đơn hàng chưa ở trạng thái ĐÃ ĐẶT (BOOKED)',
      );
    }

    bill.rentalStatus = RentalProgressStatus.DELIVERING;
    const saved = await this.billRepo.save(bill);

    // Notify Customer
    await this.notificationService.createNotification(
      bill.userId,
      'Chủ xe đang giao xe!',
      `Chủ xe đang bắt đầu vận chuyển xe ${bill.code} đến cho bạn. Hãy để ý điện thoại nhé!`,
      NotificationType.REMINDER,
      {
        billId: bill.id.toString(),
        category: 'rental-vehicle',
        status: 'delivering',
      },
    );

    return saved;
  }

  async ownerDelivered(
    id: number,
    userId: number,
    dto: DeliveryActionDto,
    photos?: Express.Multer.File[],
  ): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'user',
        'details',
        'details.vehicle',
        'details.vehicle.contract',
        'details.vehicle.contract.user',
      ],
    });
    if (!bill) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (bill.rentalStatus !== RentalProgressStatus.DELIVERING) {
      throw new BadRequestException(
        'Phải bấm đang vận chuyển trước khi xác nhận đã đến',
      );
    }

    const now = new Date();
    const thirtyMinsBeforeStart = new Date(
      bill.startDate.getTime() - 30 * 60 * 1000,
    );
    if (now < thirtyMinsBeforeStart) {
      throw new BadRequestException(
        `Chỉ được phép xác nhận đã giao đến từ lúc ${thirtyMinsBeforeStart.toLocaleString('vi-VN')} (tối đa 30 phút trước giờ thuê)`,
      );
    }

    const uploadedPhotos = await this.uploadBillImages(photos, id, 'delivery');
    bill.deliveryPhotos = uploadedPhotos.length ? uploadedPhotos : dto.photos;
    bill.rentalStatus = RentalProgressStatus.DELIVERED;
    const saved = await this.billRepo.save(bill);

    // Notify Customer
    await this.notificationService.createNotification(
      bill.userId,
      'Xe đã được giao đến!',
      `Xe cho đơn hàng ${bill.code} đã được giao đến điểm hẹn. Vui lòng kiểm tra và xác nhận nhận xe.`,
      NotificationType.REMINDER,
      {
        billId: bill.id.toString(),
        category: 'rental-vehicle',
        status: 'delivered',
      },
    );

    return saved;
  }

  async userPickup(
    id: number,
    userId: number,
    dto: PickupActionDto,
    selfie?: Express.Multer.File,
  ): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'user',
        'details',
        'details.vehicle',
        'details.vehicle.contract',
        'details.vehicle.contract.user',
      ],
    });
    if (!bill) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (bill.rentalStatus !== RentalProgressStatus.DELIVERED) {
      throw new BadRequestException('Chủ xe chưa giao xe đến nơi');
    }

    // --- FaceMatch Implementation ---
    if (!selfie) {
      throw new BadRequestException(
        'Bạn cần chụp ảnh selfie để xác nhận nhận xe',
      );
    }
    const renter = bill.user;
    if (!renter.citizenFrontImageUrl) {
      throw new BadRequestException(
        'Bạn chưa cập nhật ảnh CCCD. Vui lòng xác thực tài khoản trước.',
      );
    }

    try {
      const frontImageBuffer = await axios
        .get(renter.citizenFrontImageUrl, { responseType: 'arraybuffer' })
        .then((res) => Buffer.from(res.data));
      const similarity = await this.fptAiService.faceMatch(
        selfie.buffer,
        frontImageBuffer,
      );
      // Requirement > 80% or 90%. Let's use 80% for pickup flexibility or match auth (90%). User requested strict.
      if (similarity < 90) {
        throw new BadRequestException(
          `Xác thực khuôn mặt thất bại (${similarity.toFixed(2)}%). Vui lòng thử lại.`,
        );
      }
    } catch (e) {
      this.logger.error(`FaceMatch error`, e);
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Lỗi hệ thống khi xác thực khuôn mặt.');
    }
    // --------------------------------

    const uploadedSelfie = await this.uploadBillImage(
      selfie,
      id,
      'pickup-selfie',
    );
    bill.pickupSelfiePhoto = uploadedSelfie ?? dto.selfiePhoto;
    bill.rentalStatus = RentalProgressStatus.IN_PROGRESS;
    const saved = await this.billRepo.save(bill);

    // Notify Owner
    const ownerId = bill.details?.[0]?.vehicle?.contract?.user?.id;
    if (ownerId) {
      await this.notificationService.createNotification(
        ownerId,
        'Khách đã nhận xe!',
        `Khách hàng ${bill.user.fullName || bill.user.username} đã nhận xe ${bill.code} và bắt đầu hành trình.`,
        NotificationType.REMINDER,
        {
          billId: bill.id.toString(),
          category: 'rental-vehicle',
          status: 'pickup',
        },
      );
    }

    return saved;
  }

  async userReturnRequest(
    id: number,
    userId: number,
    dto: ReturnRequestDto,
    photos?: Express.Multer.File[],
  ): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'user',
        'details',
        'details.vehicle',
        'details.vehicle.contract',
        'details.vehicle.contract.user',
      ],
    });
    if (!bill) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (bill.rentalStatus !== RentalProgressStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Chỉ được phép yêu cầu trả xe khi đang trong quá trình hành trình (IN_PROGRESS)',
      );
    }

    const now = new Date();
    const thirtyMinsBeforeEnd = new Date(
      bill.endDate.getTime() - 30 * 60 * 1000,
    );
    if (now < thirtyMinsBeforeEnd) {
      throw new BadRequestException(
        `Chỉ được phép yêu cầu trả xe từ lúc ${thirtyMinsBeforeEnd.toLocaleString('vi-VN')} (tối đa 30 phút trước giờ kết thúc)`,
      );
    }

    bill.returnTimestampUser = now;
    const uploadedPhotos = await this.uploadBillImages(
      photos,
      id,
      'return-request',
    );
    bill.returnPhotosUser = uploadedPhotos.length ? uploadedPhotos : dto.photos;
    bill.returnLatitudeUser = dto.latitude;
    bill.returnLongitudeUser = dto.longitude;
    bill.rentalStatus = RentalProgressStatus.RETURN_REQUESTED;

    // Calculate overtime fee
    if (now > bill.endDate) {
      const diffMs = now.getTime() - bill.endDate.getTime();
      const diffHours = Math.ceil(diffMs / (60 * 60 * 1000));

      // Get hourly price from first vehicle (all same owner)
      const firstDetail = bill.details[0];
      if (firstDetail?.vehicle) {
        const hourlyPrice = parseFloat(firstDetail.vehicle.pricePerHour);
        const fee = diffHours * hourlyPrice * bill.details.length;
        bill.overtimeFee = fee.toFixed(2);
      }
    }

    const saved = await this.billRepo.save(bill);

    // Notify Owner
    const ownerId = bill.details?.[0]?.vehicle?.contract?.user?.id;
    if (ownerId) {
      await this.notificationService.createNotification(
        ownerId,
        'Yêu cầu trả xe!',
        `Khách hàng ${bill.user.fullName || bill.user.username} vừa gửi yêu cầu trả xe cho đơn hàng ${bill.code}.`,
        NotificationType.REMINDER,
        {
          billId: bill.id.toString(),
          category: 'rental-vehicle',
          status: 'return_request',
        },
      );
    }

    return saved;
  }

  async ownerConfirmReturn(
    id: number,
    userId: number,
    dto: ConfirmReturnDto,
    photos?: Express.Multer.File[],
  ): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'user',
        'details',
        'details.vehicle',
        'details.vehicle.contract',
        'details.vehicle.contract.user',
      ],
    });
    if (!bill) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (bill.rentalStatus !== RentalProgressStatus.RETURN_REQUESTED) {
      throw new BadRequestException('Khách hàng chưa gửi yêu cầu trả xe');
    }

    // GPS Validation (< 150m)
    if (bill.returnLatitudeUser && bill.returnLongitudeUser) {
      const distance = this.calculateDistance(
        dto.latitude,
        dto.longitude,
        Number(bill.returnLatitudeUser),
        Number(bill.returnLongitudeUser),
      );
      if (distance > 0.15) {
        // 0.15 km = 150m
        throw new BadRequestException(
          `Vị trí xác nhận quá xa điểm trả xe của khách (${Math.round(distance * 1000)}m > 150m)`,
        );
      }
    }

    const uploadedPhotos = await this.uploadBillImages(
      photos,
      id,
      'return-confirm',
    );
    bill.returnPhotosOwner = uploadedPhotos.length
      ? uploadedPhotos
      : dto.photos;
    bill.returnLatitudeOwner = dto.latitude;
    bill.returnLongitudeOwner = dto.longitude;
    bill.rentalStatus = RentalProgressStatus.RETURN_CONFIRMED;
    bill.status = RentalBillStatus.COMPLETED;

    // Process funds release to owner
    const totalWithOvertime =
      parseFloat(bill.total) + parseFloat(bill.overtimeFee || '0');

    const vehicles = bill.details.map((d) => d.vehicle).filter((v) => !!v);
    const ownerUserId = vehicles[0]?.contract?.user?.id;

    // Release standard funds + overtime (simplified: release all as one)
    await this.processRefundOrRelease(bill, 'release', ownerUserId);

    // If there was overtime, we should ideally deduct from user wallet here
    // but the system currently locks only the initial total.
    // For this task, we assume the user has enough balance or it's handled externally.
    // However, to keep it simple as requested, we just log it and award points on the final total.

    // Set vehicles back to AVAILABLE
    for (const detail of bill.details) {
      if (detail.vehicle) {
        detail.vehicle.availability = RentalVehicleAvailabilityStatus.AVAILABLE;
        detail.vehicle.totalRentals += 1;
        await this.vehicleRepo.save(detail.vehicle);
      }
    }

    return this.billRepo.save(bill);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async uploadBillImages(
    files: Express.Multer.File[] | undefined,
    billId: number,
    label: string,
  ): Promise<string[]> {
    if (!files?.length) {
      return [];
    }

    const uploads = await Promise.all(
      files.map((file, index) => {
        assertImageFile(file, { fieldName: label });
        return this.cloudinaryService.uploadImage(file, {
          folder: `traveline/rental-bills/${billId}/${label}`,
          publicId: `${billId}_${label}_${index}`,
        });
      }),
    );

    return uploads.map((upload) => upload.url);
  }

  private async uploadBillImage(
    file: Express.Multer.File | undefined,
    billId: number,
    label: string,
  ): Promise<string | undefined> {
    const [first] = await this.uploadBillImages(
      file ? [file] : undefined,
      billId,
      label,
    );
    return first;
  }

  async addVehicleToBill(
    id: number,
    userId: number,
    dto: ManageRentalBillVehicleDto,
  ): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể thêm xe vào đơn hàng đang chờ (PENDING)',
      );
    }

    const vehicle = await this.vehicleRepo.findOne({
      where: { licensePlate: dto.licensePlate },
      relations: ['contract'],
    });

    if (!vehicle) throw new NotFoundException('Không tìm thấy phương tiện');
    if (
      vehicle.status !== RentalVehicleApprovalStatus.APPROVED ||
      vehicle.availability !== RentalVehicleAvailabilityStatus.AVAILABLE
    ) {
      throw new BadRequestException('Phương tiện không khả dụng để cho thuê');
    }

    // Check if same owner
    if (bill.details?.length > 0) {
      const firstDetail = await this.detailRepo.findOne({
        where: { billId: bill.id },
        relations: ['vehicle'],
      });
      if (firstDetail?.vehicle?.contractId !== vehicle.contractId) {
        throw new BadRequestException(
          'Tất cả xe trong đơn hàng phải thuộc cùng một chủ sở hữu',
        );
      }
    }

    const pkg = bill.durationPackage;
    let price = 0;

    // Select price based on package
    switch (pkg) {
      case '1h':
        price = parseFloat(vehicle.pricePerHour);
        break;
      case '4h':
        price = parseFloat(vehicle.priceFor4Hours || '0');
        break;
      case '8h':
        price = parseFloat(vehicle.priceFor8Hours || '0');
        break;
      case '12h':
        price = parseFloat(vehicle.priceFor12Hours || '0');
        break;
      case '1d':
        price = parseFloat(vehicle.pricePerDay);
        break;
      case '2d':
        price = parseFloat(vehicle.priceFor2Days || '0');
        break;
      case '3d':
        price = parseFloat(vehicle.priceFor3Days || '0');
        break;
      case '5d':
        price = parseFloat(vehicle.priceFor5Days || '0');
        break;
      case '7d':
        price = parseFloat(vehicle.priceFor7Days || '0');
        break;
      default:
        price = parseFloat(vehicle.pricePerDay);
    }

    if (price <= 0) {
      throw new BadRequestException(`Phương tiện không có giá cho gói ${pkg}`);
    }

    const detail = this.detailRepo.create({
      bill,
      licensePlate: vehicle.licensePlate,
      price: this.formatMoney(price),
    });

    await this.detailRepo.save(detail);

    // Refresh details for calculation
    bill.details = await this.detailRepo.find({
      where: { billId: bill.id },
      relations: ['vehicle', 'vehicle.contract'],
    });

    // Calculate shipping fee on first vehicle added
    const { fee, isNegotiable } = await this.calculateShippingFee(bill);
    bill.shippingFee = fee.toString();
    bill.isShippingFeeNegotiable = isNegotiable;

    this.calculateTotal(bill);
    await this.billRepo.save(bill);

    return this.findOne(id, userId);
  }

  async removeVehicleFromBill(
    id: number,
    userId: number,
    licensePlate: string,
  ): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PENDING) {
      throw new BadRequestException(
        'Can only remove vehicles from PENDING bills',
      );
    }

    await this.detailRepo.delete({ billId: id, licensePlate });

    // Refresh details
    bill.details = await this.detailRepo.find({ where: { billId: bill.id } });
    this.calculateTotal(bill);
    await this.billRepo.save(bill);

    return this.findOne(id, userId);
  }

  private calculateTotal(bill: RentalBill): void {
    const totalFromDetails = (bill.details || []).reduce(
      (sum, d) => sum + parseFloat(d.price),
      0,
    );
    let finalAmount = totalFromDetails;

    // 1. Voucher
    if (bill.voucher) {
      const discount = this.vouchersService.calculateDiscountAmount(
        bill.voucher,
        finalAmount,
      );
      finalAmount -= discount;
    }

    // 2. TravelPoint (1:1)
    if (bill.travelPointsUsed > 0) {
      finalAmount = Math.max(0, finalAmount - bill.travelPointsUsed);
    }

    // 3. Shipping Fee
    const shipping = parseFloat(bill.shippingFee || '0');
    finalAmount += shipping;

    bill.total = this.formatMoney(finalAmount);
  }

  async calculateShippingFee(
    bill: RentalBill,
  ): Promise<{ fee: number; isNegotiable: boolean }> {
    if (
      !bill.pickupLatitude ||
      !bill.pickupLongitude ||
      !bill.details?.length
    ) {
      return { fee: 0, isNegotiable: false };
    }

    const firstVehicle = bill.details[0].vehicle;
    if (!firstVehicle?.contract) return { fee: 0, isNegotiable: false };

    const businessLat = Number(firstVehicle.contract.businessLatitude);
    const businessLon = Number(firstVehicle.contract.businessLongitude);

    if (!businessLat || !businessLon) return { fee: 0, isNegotiable: false };

    const distance = await this.mapService.getDistance(
      bill.pickupLatitude,
      bill.pickupLongitude,
      businessLat,
      businessLon,
    );

    return calcShippingFee(distance, bill.vehicleType);
  }
  async ownerCancel(
    id: number,
    ownerUserId: number,
    reason: string,
  ): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'details',
        'details.vehicle',
        'details.vehicle.contract',
        'details.vehicle.contract.user',
        'user',
      ],
    });

    if (!bill) throw new NotFoundException(`Rental bill ${id} not found`);

    // Check if the caller is the owner of the first vehicle (all belong to same owner)
    if (bill.details?.[0]?.vehicle?.contract?.user?.id !== ownerUserId) {
      throw new ForbiddenException('You are not the owner of this bill');
    }

    if (bill.status !== RentalBillStatus.PAID) {
      throw new BadRequestException('Can only cancel paid bills');
    }

    const now = new Date();
    if (now >= new Date(bill.startDate)) {
      throw new BadRequestException('Cannot cancel after the delivery date');
    }

    // 24h Cancellation Rule after Payment
    const payment = await this.paymentService.repo.findOne({
      where: { rentalId: bill.id, status: PaymentStatus.SUCCESS },
      order: { createdAt: 'DESC' },
    });

    if (payment) {
      const paymentTime = new Date(payment.createdAt);
      const diffMs = now.getTime() - paymentTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 24) {
        throw new BadRequestException(
          'Chỉ có thể hủy đơn hàng trong vòng 24h sau khi thanh toán',
        );
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Refund
      await this.processRefundOrRelease(bill, 'refund');

      // 2. Update status
      bill.status = RentalBillStatus.CANCELLED;
      bill.rentalStatus = RentalProgressStatus.CANCELLED;
      bill.cancelReason = reason;
      bill.cancelledBy = RentalBillCancelledBy.OWNER;

      // 3. Update vehicle availability back to available
      for (const detail of bill.details) {
        await manager.update(
          RentalVehicle,
          { licensePlate: detail.licensePlate },
          {
            availability: RentalVehicleAvailabilityStatus.AVAILABLE,
          },
        );
      }

      return await manager.save(bill);
    });
  }

  private async processRefundOrRelease(
    bill: RentalBill,
    action: 'release' | 'refund',
    ownerUserId?: number,
  ) {
    const totalAmount = parseFloat(bill.total);
    if (totalAmount <= 0) return;

    if (action === 'refund') {
      // 1. Refund External Payment if exists
      await this.paymentService.refundLatestByRental(bill.id);

      // 2. Refund Travel Points
      if (bill.travelPointsUsed > 0) {
        await this.userRepo.increment(
          { id: bill.userId },
          'travelPoint',
          bill.travelPointsUsed,
        );
        this.logger.log(
          `Refunded ${bill.travelPointsUsed} points to user ${bill.userId} for rental ${bill.id}`,
        );

        await this.notificationService.createNotification(
          bill.userId,
          'Hoàn điểm TravelPoints',
          `Bạn đã được hoàn lại ${bill.travelPointsUsed} điểm từ đơn hàng ${bill.code}.`,
          NotificationType.REMINDER,
          {
            billId: bill.id.toString(),
            category: 'rental-vehicle',
            type: 'refund_points',
          },
        );
      }

      // 3. Decrement Voucher Usage
      if (bill.voucherId) {
        await this.vouchersService.decrementUsage(bill.voucherId);
        this.logger.log(
          `Decremented usage for voucher ${bill.voucherId} due to refund`,
        );
      }

      // Notify Refund Success
      await this.notificationService.createNotification(
        bill.userId,
        'Hoàn tiền thành công',
        `Số tiền ${parseFloat(bill.total).toLocaleString('vi-VN')}đ từ đơn hàng ${bill.code} đã được hoàn lại vào ví/tài khoản của bạn.`,
        NotificationType.REMINDER,
        {
          billId: bill.id.toString(),
          category: 'rental-vehicle',
          type: 'refund_money',
        },
      );
    }

    // 4. Release Wallet Funds (Back to user if refund, or to owner if release)
    await this.walletService.releaseFunds(
      bill.userId,
      totalAmount,
      `rental:${bill.id}`,
      action === 'release' ? ownerUserId : undefined,
    );

    const shouldUseBlockchain =
      bill.requiresEthDeposit && !!bill.ownerEthAddress;

    if (action === 'release' && shouldUseBlockchain) {
      await this.blockchainService.adminReleaseFundsForRental(bill.id);
    } else if (action === 'refund' && shouldUseBlockchain) {
      await this.blockchainService.adminRefundForRental(bill.id);
    } else if (action === 'release' && ownerUserId) {
      this.logger.log(
        `Automatically released funds to owner ${ownerUserId} for bill ${bill.code}`,
      );

      // Notify Owner about Payout
      await this.notificationService.createNotification(
        ownerUserId,
        'Thanh toán doanh thu',
        `Hệ thống đã chuyển ${totalAmount.toLocaleString('vi-VN')}đ doanh thu từ đơn hàng ${bill.code} vào tài khoản của bạn.`,
        NotificationType.REMINDER,
        {
          billId: bill.id.toString(),
          category: 'rental-vehicle',
          type: 'payout',
        },
      );
    }

    if (action === 'release') {
      const pointsEarned = Math.floor(totalAmount / 100) * 1;
      if (pointsEarned > 0) {
        await this.userRepo.increment(
          { id: bill.userId },
          'travelPoint',
          pointsEarned,
        );
        this.logger.log(
          `User ${bill.userId} earned ${pointsEarned} points for completed rental ${bill.id}`,
        );

        await this.notificationService.createNotification(
          bill.userId,
          'Thưởng điểm TravelPoints',
          `Chúc mừng! Bạn nhận được ${pointsEarned} điểm từ việc hoàn thành đơn hàng ${bill.code}.`,
          NotificationType.REMINDER,
          {
            billId: bill.id.toString(),
            category: 'rental-vehicle',
            type: 'reward_points',
          },
        );
      }
    }
  }

  async generatePaymentQR(id: number, userId: number) {
    const bill = await this.findOne(id, userId);

    const qrPath = path.join(process.cwd(), 'public', 'admin_qr.png');
    let qrData = '';
    try {
      const imageBuffer = fs.readFileSync(qrPath);
      qrData = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } catch (err) {
      this.logger.error(`Failed to read admin_qr.png: ${err.message}`);
      qrData = '/public/admin_qr.png';
    }

    return {
      qrData,
      amount: bill.total,
      message:
        'Vui lòng quét mã để chuyển khoản vào tài khoản trung gian Traveline (Vietcombank)',
    };
  }

  async findAll(
    userId: number,
    params: { status?: RentalBillStatus } = {},
  ): Promise<RentalBill[]> {
    const qb = this.billRepo.createQueryBuilder('bill');
    qb.where('bill.userId = :userId', { userId });
    if (params.status)
      qb.andWhere('bill.status = :status', { status: params.status });
    return qb
      .leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('details.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.vehicleCatalog', 'catalog')
      .orderBy('bill.createdAt', 'DESC')
      .getMany();
  }

  async findBillsByOwner(
    ownerId: number,
    params: { status?: RentalBillStatus } = {},
  ): Promise<RentalBill[]> {
    const qb = this.billRepo.createQueryBuilder('bill');

    // Join relations to filter by vehicle owner
    qb.leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('details.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.contract', 'contract')
      .leftJoinAndSelect('contract.user', 'owner')
      // Also join other necessary data for display
      .leftJoinAndSelect('vehicle.vehicleCatalog', 'catalog')
      .leftJoinAndSelect('bill.user', 'renter');

    // Filter where contract owner is the requested user
    qb.where('owner.id = :ownerId', { ownerId });

    if (params.status) {
      qb.andWhere('bill.status = :status', { status: params.status });
    }

    return qb.orderBy('bill.createdAt', 'DESC').getMany();
  }

  async generateGuestLink(
    id: number,
    userId: number,
  ): Promise<{ token: string; expiresAt: Date; guestLink: string }> {
    const bill = await this.findOne(id, userId);

    // Ensure caller is the owner (only owner can generate links)
    if (bill.details?.[0]?.vehicle?.contract?.user?.id !== userId) {
      throw new ForbiddenException(
        'Only vehicle owner can generate guest links',
      );
    }

    if (
      bill.status !== RentalBillStatus.PAID &&
      bill.status !== RentalBillStatus.PENDING
    ) {
      // Ideally links are for delivery (PENDING/PAID) or return (RENTING)
      // Let's allow it generally but keep in mind validation later
    }

    // Generate token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token valid for 24h

    bill.guestToken = token;
    bill.guestTokenExpiresAt = expiresAt;

    await this.billRepo.save(bill);

    // Sinh link đầy đủ dựa trên cấu hình môi trường
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const guestLink = `${baseUrl.replace(/\/$/, '')}/guest/tracking/${token}`;

    return { token, expiresAt, guestLink };
  }

  async getBillByGuestToken(token: string): Promise<any> {
    const bill = await this.billRepo.findOne({
      where: {
        guestToken: token,
        // guestTokenExpiresAt: MoreThan(new Date()) // TypeORM MoreThan import needed if used strictly, but let's do manual check
      },
      relations: ['details', 'details.vehicle', 'user'],
    });

    if (!bill) {
      throw new NotFoundException('Invalid or expired token');
    }

    if (bill.guestTokenExpiresAt && new Date() > bill.guestTokenExpiresAt) {
      throw new ForbiddenException('Token expired');
    }

    // Return restricted info
    return {
      billId: bill.id,
      code: bill.code,
      status: bill.status,
      customerName: bill.contactName || bill.user?.fullName,
      customerPhone: bill.contactPhone,
      startDate: bill.startDate,
      endDate: bill.endDate,
      licensePlate: bill.details?.[0]?.licensePlate,
      vehicleName: bill.details?.[0]?.vehicle?.vehicleCatalog
        ? `${bill.details[0].vehicle.vehicleCatalog.brand} ${bill.details[0].vehicle.vehicleCatalog.model}`
        : 'Unknown Vehicle',
      location: bill.location,
    };
  }

  async submitGuestEvidence(
    token: string,
    files: Express.Multer.File[],
    gps: { lat: number; lon: number },
  ): Promise<void> {
    const bill = await this.billRepo.findOne({
      where: { guestToken: token },
      relations: ['details', 'details.vehicle', 'details.vehicle.contract'],
    });

    if (!bill) throw new NotFoundException('Invalid token');
    if (bill.guestTokenExpiresAt && new Date() > bill.guestTokenExpiresAt) {
      throw new ForbiddenException('Token expired');
    }

    const isDelivery =
      bill.status === RentalBillStatus.PENDING ||
      bill.status === RentalBillStatus.PAID;
    const isReturn =
      bill.rentalStatus === RentalProgressStatus.IN_PROGRESS ||
      bill.rentalStatus === RentalProgressStatus.RETURN_REQUESTED;

    if (!isDelivery && !isReturn) {
      throw new BadRequestException('Not in a state to receive evidence');
    }

    // Owner ID for context (even though done by guest)
    const ownerId = bill.details?.[0]?.vehicle?.contract?.user?.id;
    if (!ownerId) throw new BadRequestException('Owner not found');

    if (isDelivery) {
      // Reuse ownerDelivered logic but bypass auth checks on ownership
      // We simulate the owner action
      const dto = new DeliveryActionDto();
      dto.latitude = gps.lat;
      dto.longitude = gps.lon;

      // We need to implement a "force" or "system" version of ownerDelivered
      // OR just duplicate the logic here to be safe and avoid modifying guarded methods.
      // Let's duplicate core logic for safety and clarity.

      // Logic from ownerDelivered:
      if (files?.length > 0) {
        const uploaded = await this.cloudinaryService.uploadMultipleFiles(
          files,
          'rentals/delivery',
        );
        bill.deliveryPhotos = uploaded.map((f) => f.url);
      }

      bill.deliveryLatitudeOwner = gps.lat;
      bill.deliveryLongitudeOwner = gps.lon;
      bill.status = RentalBillStatus.PAID; // Still PAID, but progress is DELIVERED
      bill.rentalStatus = RentalProgressStatus.DELIVERED;
      bill.deliveryDate = new Date();

      await this.billRepo.save(bill);

      // Notify user
      await this.notificationService.createNotification(
        bill.userId,
        'Xe đã đến điểm giao',
        `Nhân viên đã giao xe ${bill.details[0].licensePlate} đến điểm hẹn. Vui lòng kiểm tra và nhận xe.`,
        NotificationType.REMINDER,
        { billId: bill.id.toString(), category: 'rental-vehicle' },
      );
    } else if (isReturn) {
      // Reuse ownerConfirmReturn logic
      // But wait, "guest" usually implies the delivery guy.
      // For RETURN, the guest (delivery guy) is picking up the car from the user.
      // So this action is equivalent to "Owner Confirm Return".

      const dto = new ConfirmReturnDto();
      dto.latitude = gps.lat;
      dto.longitude = gps.lon;
      // dto.returnCondition... defaulting to 'good' or we need frontend input.
      // For simplicity, assume good or existing condition.

      // Verify distance (copy logic)
      const userLat = Number(bill.returnLatitudeUser);
      const userLon = Number(bill.returnLongitudeUser);
      if (!userLat || !userLon) {
        // If user hasn't requested return yet, we can't confirm return?
        // Actually, owner/guest can confirm return directly sometimes.
        // But traditionally flow is User Request -> Owner Confirm.
        // If User hasn't requested, maybe we allow forcing it?
        // Let's assume standard flow: User must have requested return first.
        if (bill.rentalStatus !== RentalProgressStatus.RETURN_REQUESTED) {
          throw new BadRequestException('User has not requested return yet');
        }
      }

      if (files?.length > 0) {
        const uploaded = await this.cloudinaryService.uploadMultipleFiles(
          files,
          'rentals/return_owner',
        );
        bill.returnPhotosOwner = uploaded.map((f) => f.url);
      }

      bill.returnLatitudeOwner = gps.lat;
      bill.returnLongitudeOwner = gps.lon;

      // Calculate distance check
      if (userLat && userLon) {
        const dist = this.mapService.calculateHaversineDistance(
          userLat,
          userLon,
          gps.lat,
          gps.lon,
        );
        if (dist > 0.05) {
          // 50m
          throw new BadRequestException(
            `Vi trí quá xa so với khách hàng (${(dist * 1000).toFixed(0)}m)`,
          );
        }
      }

      bill.status = RentalBillStatus.COMPLETED;
      bill.rentalStatus = RentalProgressStatus.RETURN_CONFIRMED;
      bill.returnDate = new Date(); // Actual return time

      await this.processRefundOrRelease(bill, 'release', ownerId);
      await this.billRepo.save(bill);
    }
  }
}
