import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { TravelRoute, TravelRouteStatus } from './entities/travel-route.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { addDays, addMonths, addYears, isSameDay, subDays, subMonths, subYears } from 'date-fns';

@Injectable()
export class TravelRouteCronService {
  private readonly logger = new Logger(TravelRouteCronService.name);

  constructor(
    @InjectRepository(TravelRoute)
    private readonly routeRepo: Repository<TravelRoute>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleAnniversaryNotifications() {
    this.logger.log('Checking for travel route anniversaries...');
    
    // Find completed routes
    // Optimization: In a real large app, we should query by date in DB directly.
    // For now, fetching completed routes and filtering in JS is okay if dataset is small,
    // but let's try to be slightly more efficient if possible, or just fetch all completed.
    // Given the complexity of date functions in SQL across different DBs, fetching active/completed routes might be easier.
    
    const routes = await this.routeRepo.find({
      where: { status: TravelRouteStatus.COMPLETED },
      relations: { user: true },
    });

    const today = new Date();

    for (const route of routes) {
      if (!route.endDate || !route.user) continue;

      const endDate = new Date(route.endDate);
      
      // Check 1 week
      if (isSameDay(endDate, subDays(today, 7))) {
        await this.sendAnniversaryNotification(route, '1 tuần');
      }
      // Check 1 month
      else if (isSameDay(endDate, subMonths(today, 1))) {
        await this.sendAnniversaryNotification(route, '1 tháng');
      }
      // Check 1 year
      else if (isSameDay(endDate, subYears(today, 1))) {
        await this.sendAnniversaryNotification(route, '1 năm');
      }
    }
  }

  private async sendAnniversaryNotification(route: TravelRoute, period: string) {
    const user = route.user;
    if (!user) return;

    const title = 'Kỷ niệm chuyến đi!';
    const body = `Đã ${period} kể từ khi bạn hoàn thành chuyến đi "${route.name}". Hãy xem lại những khoảnh khắc đáng nhớ nhé!`;

    // Persist to in-app notification inbox
    await this.notificationService.createNotification(
      user.id,
      title,
      body,
      'anniversary' as any,
      { routeId: route.id.toString() }
    );

    // Send Email
    if (user.email) {
      await this.notificationService.sendEmail(
        user.email,
        title,
        `<p>Xin chào ${user.fullName || user.username},</p>
         <p>${body}</p>
         <p>Trân trọng,<br/>Traveline</p>`
      );
    }

    // Send Push Notification
    if (user.fcmToken) {
        await this.notificationService.sendPushNotification(
            user.fcmToken,
            title,
            body,
            { routeId: route.id.toString(), type: 'anniversary' }
        );
    }
  }
}
