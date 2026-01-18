import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { TravelRoute, TravelRouteStatus } from './entities/travel-route.entity';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../notification/entities/notification.entity';
import { NotificationService } from '../notification/notification.service';
import { TravelRoutesService } from './travel-route.service';
import {
  addDays,
  addMonths,
  addYears,
  isSameDay,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';

@Injectable()
export class TravelRouteCronService {
  private readonly logger = new Logger(TravelRouteCronService.name);

  constructor(
    @InjectRepository(TravelRoute)
    private readonly routeRepo: Repository<TravelRoute>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly notificationService: NotificationService,
    private readonly travelRouteService: TravelRoutesService,
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
      relations: { user: true }, // stops derived in service
    });

    this.logger.log(`Found ${routes.length} completed routes to check`);

    const today = new Date();
    const oneWeekAgo = subDays(today, 7);
    const oneMonthAgo = subMonths(today, 1);
    const oneYearAgo = subYears(today, 1);

    const matchedRoutes: any[] = [];
    let notificationsSent = 0;

    for (const route of routes) {
      if (!route.endDate || !route.user) {
        this.logger.log(`Route ${route.id} skipped: missing endDate or user`);
        continue;
      }

      const endDate = new Date(route.endDate);
      this.logger.log(
        `Route ${route.id} "${route.name}" endDate: ${endDate.toISOString()}`,
      );

      let period = '';
      if (isSameDay(endDate, oneWeekAgo)) period = '1 tuần';
      else if (isSameDay(endDate, oneMonthAgo)) period = '1 tháng';
      else if (isSameDay(endDate, oneYearAgo)) period = '1 năm';

      if (period) {
        this.logger.log(`Route ${route.id} matches ${period} anniversary!`);
        
        // Check if already sent today
        const alreadySent = await this.notificationRepo
          .createQueryBuilder('n')
          .where('n.user_id = :userId', { userId: route.user.id })
          .andWhere('n.type = :type', { type: NotificationType.ANNIVERSARY })
          .andWhere("n.data->>'routeId' = :routeId", { routeId: route.id.toString() })
          .andWhere("n.data->>'period' = :period", { period })
          .andWhere('n.createdAt >= :today', { today: new Date(new Date().setHours(0,0,0,0)) })
          .getOne();

        if (alreadySent) {
          this.logger.log(`Route ${route.id} anniversary already notified today. Skipping.`);
          continue;
        }

        await this.sendAnniversaryNotification(route, period);
        notificationsSent++;

        // Fetch full details using shared service
        const detailedRoute = await this.travelRouteService.getRouteWithMediaAggregates(route.id);

        if (detailedRoute) {
          matchedRoutes.push({
            ...detailedRoute,
            period,
            userName: route.user.fullName || route.user.username,
          });
        }
      } else {
        this.logger.log(
          `Route ${route.id} does not match any anniversary date`,
        );
      }
    }

    return {
      checkedCount: routes.length,
      notificationsSent,
      matchedRoutes,
    };
  }

  private async sendAnniversaryNotification(
    route: TravelRoute,
    period: string,
  ) {
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
      { routeId: route.id.toString(), period },
    );

    // Send Email
    if (user.email) {
      await this.notificationService.sendEmail(
        user.email,
        title,
        `<p>Xin chào ${user.fullName || user.username},</p>
         <p>${body}</p>
         <p>Trân trọng,<br/>Traveline</p>`,
      );
    }

    // Send Push Notification
    if (user.fcmToken) {
      await this.notificationService.sendPushNotification(
        user.fcmToken,
        title,
        body,
        { routeId: route.id.toString(), type: 'anniversary' },
      );
    }
  }
}
