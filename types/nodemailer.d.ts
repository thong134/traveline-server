declare module 'nodemailer' {
  import { Options } from 'nodemailer/lib/mailer';
  import SMTPTransport from 'nodemailer/lib/smtp-transport';

  export interface SentMessageInfo {
    messageId: string;
    envelope?: unknown;
    accepted?: string[];
    rejected?: string[];
    pending?: string[];
    response?: string;
  }

  export interface Transporter<T = SentMessageInfo> {
    sendMail(mailOptions: Options): Promise<T>;
  }

  export function createTransport<T = SentMessageInfo>(
    options: SMTPTransport.Options | string,
    defaults?: SMTPTransport.Options,
  ): Transporter<T>;

  export function getTestMessageUrl(info: SentMessageInfo): string | false;
}
