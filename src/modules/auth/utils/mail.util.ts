import { createTransport, getTestMessageUrl } from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';

export async function sendResetEmail(to: string, code: string) {
  const transporter: Transporter<SentMessageInfo> = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info: SentMessageInfo = await transporter.sendMail({
    from: `"No Reply" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Mã đặt lại mật khẩu',
    html: `
      <p>Xin chào,</p>
      <p>Mã đặt lại mật khẩu của bạn là: <strong style="font-size:18px;">${code}</strong></p>
      <p>Mã có hiệu lực trong 10 phút. Vui lòng nhập mã này vào màn hình đặt lại mật khẩu và không chia sẻ cho bất kỳ ai.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
      <p>Trân trọng,<br/>Đội ngũ Traveline</p>
    `,
  });

  const preview = getTestMessageUrl(info);
  if (preview) {
    console.log('Preview email URL:', preview);
  }
}

export async function sendEmailVerificationEmail(
  to: string,
  code: string,
): Promise<void> {
  const transporter: Transporter<SentMessageInfo> = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info: SentMessageInfo = await transporter.sendMail({
    from: `"Traveline" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Xác thực email Traveline',
    html: `
      <p>Xin chào,</p>
      <p>Mã xác thực email của bạn là: <strong style="font-size:18px;">${code}</strong></p>
      <p>Mã có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
      <p>Nếu bạn không yêu cầu xác thực, hãy bỏ qua email này.</p>
      <p>Trân trọng,<br/>Đội ngũ Traveline</p>
    `,
  });

  const preview = getTestMessageUrl(info);
  if (preview) {
    console.log('Preview email URL:', preview);
  }
}
