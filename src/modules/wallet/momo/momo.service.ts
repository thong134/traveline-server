
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly ipnUrl: string;
  private readonly redirectUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE') ?? '';
    this.accessKey = this.configService.get<string>('MOMO_ACCESS_KEY') ?? '';
    this.secretKey = this.configService.get<string>('MOMO_SECRET_KEY') ?? '';
    this.endpoint = this.configService.get<string>(
      'MOMO_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/create',
    );
    this.ipnUrl = this.configService.get<string>('MOMO_IPN_URL') ?? '';
    this.redirectUrl = this.configService.get<string>('MOMO_REDIRECT_URL') ?? '';
  }

  /**
   * Tạo Payment Link gửi sang MoMo
   * @param orderId Mã đơn hàng duy nhất (ví dụ: MOMO123456)
   * @param amount Số tiền (VND)
   * @param orderInfo Nội dung thanh toán
   * @param extraData Dữ liệu phụ (lưu userId hoặc thông tin khác dạng base64)
   */
  async createPaymentUrl(
    orderId: string,
    amount: number,
    orderInfo: string,
    extraData: string = '',
  ) {
    const requestId = orderId; // Thông thường requestId = orderId
    const requestType = 'captureWallet';

    if (!this.partnerCode || !this.accessKey || !this.secretKey) {
      throw new BadRequestException(
        'MoMo credentials (MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY) are missing in .env',
      );
    }

    if (!this.redirectUrl || !this.ipnUrl) {
      throw new BadRequestException(
        'MoMo URLs (MOMO_REDIRECT_URL, MOMO_IPN_URL) are missing in .env',
      );
    }

    if (this.ipnUrl.includes('your-backend-domain')) {
      throw new BadRequestException(
        'MOMO_IPN_URL in .env is still a placeholder. Please replace it with your actual Ngrok/Domain URL.',
      );
    }

    // Chuỗi cần ký (Signature String) theo chuẩn MoMo
    // format: accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
    const rawSignature =
      `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}` +
      `&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'Traveline',
      storeId: 'Mục tiêu chính là Traveline',
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang: 'vi',
      requestType: requestType,
      autoCapture: true,
      extraData: extraData,
      signature: signature,
    };

    try {
      this.logger.log(`Sending payment request to MoMo: ${JSON.stringify(requestBody)}`);
      const response = await firstValueFrom(
        this.httpService.post(this.endpoint, requestBody),
      );
      
      this.logger.log(`MoMo response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`MoMo API Error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create MoMo payment url');
    }
  }

  /**
   * Xác thực chữ ký (Signature) từ IPN MoMo gửi về
   */
  verifySignature(body: any): boolean {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = body;

    // Chuỗi cần ký để đối chiếu
    const rawSignature =
      `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}` +
      `&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}` +
      `&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const generatedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    if (generatedSignature !== signature) {
      this.logger.warn(
        `Invalid signature! Expected: ${generatedSignature}, Received: ${signature}`,
      );
      return false;
    }
    return true;
  }
}
