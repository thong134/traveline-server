import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { createTransport, Transporter, SentMessageInfo } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { NotificationGateway } from './notification.gateway';
import { TravelRoutesService } from '../travel-route/travel-route.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private mailTransporter: Transporter<SentMessageInfo>;
  private firebaseApp: admin.app.App;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gateway: NotificationGateway,
    @Inject(forwardRef(() => TravelRoutesService))
    private readonly travelRoutesService: TravelRoutesService,
  ) {}

  // ... init methods ...

  async findMyNotifications(userId: number, type?: NotificationType): Promise<Notification[]> {
    const qb = this.notificationRepo.createQueryBuilder('notification');
    qb.where('notification.user_id = :userId', { userId });
    
    if (type) {
      qb.andWhere('notification.type = :type', { type });
    }
    
    qb.orderBy('notification.createdAt', 'DESC');
    const notifications = await qb.getMany();

    // Enrich anniversary notifications with full route details
    const enriched = await Promise.all(notifications.map(async (notif) => {
      // Check if it's an anniversary notification and has routeId
      if (notif.type === NotificationType.ANNIVERSARY && notif.data?.routeId) {
        try {
           const routeDetail = await this.travelRoutesService.getRouteWithMediaAggregates(Number(notif.data.routeId));
           if (routeDetail) {
             return {
               ...notif,
               data: {
                 ...notif.data,
                 ...routeDetail, // This merges stops, aggregatedMedia, etc. into data
               }
             };
           }
        } catch (e) {
           this.logger.warn(`Failed to enrich notification ${notif.id}: ${e.message}`);
        }
      }
      return notif;
    }));

    return enriched as Notification[];
  }

  onModuleInit() {
    this.initMailTransporter();
    this.initFirebase();
  }

  private initMailTransporter() {
    this.mailTransporter = createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT') || 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  private initFirebase() {
    if (admin.apps.length > 0) {
      this.firebaseApp = admin.apps[0]!;
      return;
    }

    try {
      const saPath = this.configService.get('FIREBASE_ADMIN_CREDENTIAL_PATH') || 
                     this.configService.get('FIREBASE_SERVICE_ACCOUNT_PATH');

      if (saPath) {
        const absolutePath =
          saPath.startsWith('/') || saPath.includes(':') // Windows check roughly
            ? saPath
            : require('path').join(process.cwd(), saPath);

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(absolutePath),
        });
        this.logger.log(
          `Firebase Admin initialized using cert at: ${absolutePath}`,
        );
      } else {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.logger.log('Firebase Admin initialized using applicationDefault');
      }
    } catch (error) {
      this.logger.warn(
        'Failed to initialize Firebase Admin. Push notifications will not work.',
        error,
      );
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await this.mailTransporter.sendMail({
        from: `"Traveline" <${this.configService.get('SMTP_USER')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized, skipping push notification');
      return;
    }

    try {
      await this.firebaseApp.messaging().send({
        token,
        notification: {
          title,
          body,
        },
        data,
      });
      this.logger.log(`Push notification sent to ${token}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to ${token}`, error);
    }
  }

  async createNotification(
    userId: number,
    title: string,
    body: string,
    type: NotificationType,
    data?: any,
  ): Promise<Notification> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const notification = this.notificationRepo.create({
      user,
      title,
      body,
      type,
      data,
      isRead: false,
    });
    const saved = await this.notificationRepo.save(notification);

    // 1. Emit real-time notification via WebSocket
    this.gateway.sendToUser(userId, 'new-notification', saved);

    // 2. Send Push Notification if user has token
    if (user.fcmToken) {
      await this.sendPushNotification(user.fcmToken, title, body, data);
    }

    return saved;
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  async findAllNotifications(): Promise<Notification[]> {
    return this.notificationRepo.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 100, // Limit for safety
    });
  }
}
