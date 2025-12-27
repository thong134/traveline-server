import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    description: 'URL để thực hiện thanh toán (Link MoMo hoặc Link ảnh QR)',
    examples: {
      momo: {
        value: 'https://test-payment.momo.vn/v2/gateway/api/payment/...,',
        description: 'Link điều hướng sang trang thanh toán MoMo',
      },
      qr_code: {
        value: '/public/admin_qr.png',
        description: 'Đường dẫn ảnh QR để hiển thị trên ứng dụng',
      },
    },
  })
  payUrl: string;

  @ApiProperty({ description: 'ID của bản ghi thanh toán trong hệ thống', example: 123 })
  paymentId: number;
}

export class QRCodeResponseDto {
  @ApiProperty({
    description: 'Đường dẫn ảnh QR Code',
    example: '/public/admin_qr.png',
  })
  qrData: string;

  @ApiProperty({ description: 'Số tiền cần thanh toán', example: '500000.00' })
  amount: string;

  @ApiProperty({
    description: 'Thông báo hướng dẫn thanh toán',
    example: 'Vui lòng quét mã để chuyển khoản vào tài khoản trung gian Traveline (Vietcombank)',
  })
  message: string;
}
