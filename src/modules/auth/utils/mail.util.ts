import { createTransport, getTestMessageUrl } from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';

export async function sendResetEmail(to: string, link: string) {
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
    subject: 'Password reset',
    html: `<p>We received a request to reset your password. Click link below to reset:</p>
           <p><a href="${link}">Reset password</a></p>
           <p>If you didn't request this, ignore this email.</p>`,
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
