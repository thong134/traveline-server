import { createTransport, getTestMessageUrl } from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';

export async function sendResetEmail(to: string, link: string) {
  // create transporter from env
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

  // In dev, Ethereal returns preview URL
  const preview = getTestMessageUrl(info);
  if (preview) {
    console.log('Preview email URL:', preview);
  }
}
