import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan } from 'typeorm';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { TravelRoute } from '../travel-route/entities/travel-route.entity';
import { RentalBill } from '../rental-bill/entities/rental-bill.entity';
import { HotelBill } from '../hotel/bill/entities/hotel-bill.entity';
import { RestaurantBooking } from '../restaurant/booking/entities/restaurant-booking.entity';
import { NotificationService } from './notification.service';
import { NotificationType } from './entities/notification.entity';

@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    @InjectRepository(TravelRoute)
    private readonly routeRepo: Repository<TravelRoute>,
    @InjectRepository(RentalBill)
    private readonly rentalRepo: Repository<RentalBill>,
    @InjectRepository(HotelBill)
    private readonly hotelRepo: Repository<HotelBill>,
    @InjectRepository(RestaurantBooking)
    private readonly restaurantRepo: Repository<RestaurantBooking>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleUpcomingReminders() {
    this.logger.log('Checking for upcoming event reminders...');
    await this.triggerReminderCheck();
  }

  async triggerReminderCheck() {
    const tomorrow = addDays(new Date(), 1);
    const startOfTomorrow = startOfDay(tomorrow);
    const endOfTomorrow = endOfDay(tomorrow);

    this.logger.log(`Scanning events for: ${startOfTomorrow.toISOString()} to ${endOfTomorrow.toISOString()}`);

    let totalSent = 0;

    // 1. Travel Routes
    const routes = await this.routeRepo.find({
      where: {
        startDate: MoreThanOrEqual(startOfTomorrow),
        // We only care if it starts tomorrow
        // actually for simplicity let's just check if it's within tomorrow range
      },
      relations: { user: true },
    });
    
    // Filtering in JS for exact day match to be safe across timezones/TS
    for (const route of routes) {
      if (route.user && route.startDate && this.isWithinDay(route.startDate, startOfTomorrow, endOfTomorrow)) {
        await this.notificationService.createNotification(
          route.user.id,
          'Lộ trình sắp bắt đầu!',
          `Hành trình "${route.name}" của bạn sẽ khởi hành vào ngày mai. Hãy chuẩn bị hành lý nhé!`,
          NotificationType.REMINDER,
          { routeId: route.id.toString(), category: 'travel-route' },
        );
        totalSent++;
      }
    }

    // 2. Rental Bills
    const rentals = await this.rentalRepo.find({
      where: {
        startDate: MoreThanOrEqual(startOfTomorrow),
      },
      relations: { user: true },
    });
    for (const rental of rentals) {
      if (rental.user && this.isWithinDay(rental.startDate, startOfTomorrow, endOfTomorrow)) {
        await this.notificationService.createNotification(
          rental.user.id,
          'Nhắc nhở giao xe!',
          `Đơn thuê xe ${rental.code} của bạn sẽ bắt đầu vào ngày mai. Đơn vị vận chuyển sẽ liên hệ sớm.`,
          NotificationType.REMINDER,
          { billId: rental.id.toString(), category: 'rental-vehicle' },
        );
        totalSent++;
      }
    }

    // 3. Hotel Bills
    const hotels = await this.hotelRepo.find({
      where: {
        checkInDate: MoreThanOrEqual(startOfTomorrow),
      },
      relations: { user: true },
    });
    for (const hotel of hotels) {
      if (hotel.user && this.isWithinDay(hotel.checkInDate, startOfTomorrow, endOfTomorrow)) {
        await this.notificationService.createNotification(
          hotel.user.id,
          'Lịch nhận phòng khách sạn!',
          `Bạn có lịch nhận phòng tại ${hotel.cooperation?.name || 'khách sạn'} vào ngày mai.`,
          NotificationType.REMINDER,
          { billId: hotel.id.toString(), category: 'hotel' },
        );
        totalSent++;
      }
    }

    // 4. Restaurant Bookings
    const bookings = await this.restaurantRepo.find({
      where: {
        checkInDate: MoreThanOrEqual(startOfTomorrow),
      },
      relations: { user: true },
    });
    for (const booking of bookings) {
      if (booking.user && this.isWithinDay(booking.checkInDate, startOfTomorrow, endOfTomorrow)) {
        await this.notificationService.createNotification(
          booking.user.id,
          'Lịch hẹn nhà hàng!',
          `Bạn có lịch đặt bàn tại ${booking.cooperation?.name || 'nhà hàng'} vào ngày mai.`,
          NotificationType.REMINDER,
          { bookingId: booking.id.toString(), category: 'restaurant' },
        );
        totalSent++;
      }
    }

    this.logger.log(`Reminder check completed. Sent ${totalSent} notifications.`);
    return { remindersSent: totalSent };
  }

  private isWithinDay(date: Date, start: Date, end: Date): boolean {
    const d = new Date(date);
    return d >= start && d <= end;
  }
}
