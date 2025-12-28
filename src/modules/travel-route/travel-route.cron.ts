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
    await this.triggerAnniversaryCheck();
  }

  // Public method for manual testing
  async triggerAnniversaryCheck() {
    const routes = await this.routeRepo.find({
      where: { status: TravelRouteStatus.COMPLETED },
      relations: { user: true },
    });

    this.logger.log(`Found ${routes.length} completed routes to check`);

    const today = new Date();
    const oneWeekAgo = subDays(today, 7);
    const oneMonthAgo = subMonths(today, 1);
    const oneYearAgo = subYears(today, 1);

    this.logger.log(`Today: ${today.toISOString()}`);
    this.logger.log(`1 week ago: ${oneWeekAgo.toISOString()}`);
    this.logger.log(`1 month ago: ${oneMonthAgo.toISOString()}`);
    this.logger.log(`1 year ago: ${oneYearAgo.toISOString()}`);

    let notificationsSent = 0;

    for (const route of routes) {
      if (!route.endDate || !route.user) {
        this.logger.log(`Route ${route.id} skipped: missing endDate or user`);
        continue;
      }

      const endDate = new Date(route.endDate);
      this.logger.log(`Route ${route.id} "${route.name}" endDate: ${endDate.toISOString()}`);
      
      // Check 1 week
      if (isSameDay(endDate, oneWeekAgo)) {
        this.logger.log(`Route ${route.id} matches 1 week anniversary!`);
        await this.sendAnniversaryNotification(route, '1 tuần');
        notificationsSent++;
      }
      // Check 1 month
      else if (isSameDay(endDate, oneMonthAgo)) {
        this.logger.log(`Route ${route.id} matches 1 month anniversary!`);
        await this.sendAnniversaryNotification(route, '1 tháng');
        notificationsSent++;
      }
      // Check 1 year
      else if (isSameDay(endDate, oneYearAgo)) {
        this.logger.log(`Route ${route.id} matches 1 year anniversary!`);
        await this.sendAnniversaryNotification(route, '1 năm');
        notificationsSent++;
      } else {
        this.logger.log(`Route ${route.id} does not match any anniversary date`);
      }
    }

    return { checked: routes.length, notificationsSent };
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
