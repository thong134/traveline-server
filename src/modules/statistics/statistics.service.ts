import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { TravelRoute } from '../travel-route/entities/travel-route.entity';
import { RentalBill } from '../rental-bill/entities/rental-bill.entity';
import { RentalBillStatus } from '../rental-bill/entities/rental-bill.entity'; 
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TravelRoute)
    private readonly routeRepository: Repository<TravelRoute>,
    @InjectRepository(RentalBill)
    private readonly rentalBillRepository: Repository<RentalBill>,
  ) {}

  async getDashboardSummary() {
    const totalUsers = await this.userRepository.count();
    const totalRoutes = await this.routeRepository.count();
    const totalRevenueResult = await this.rentalBillRepository
      .createQueryBuilder('bill')
      .where('bill.status = :status', { status: RentalBillStatus.COMPLETED })
      .select('SUM(bill.total)', 'sum')
      .getRawOne();
    
    // Total Revenue is string in DB
    const totalRevenue = parseFloat(totalRevenueResult?.sum || '0');

    // New Users this month
    const startOfCurrentMonth = startOfMonth(new Date());
    const newUsers = await this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(startOfCurrentMonth) }
    });

    return {
      totalUsers,
      totalRoutes,
      totalRevenue,
      newUsers
    };
  }

  async getUserGrowthStats(period: 'year' | 'month' = 'year') {
    // Get last 12 months
    const stats: { name: string; users: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const count = await this.userRepository.count({
        where: {
          createdAt: Between(start, end),
        },
      });

      stats.push({
        name: format(date, 'MM/yyyy'),
        users: count,
      });
    }
    return stats;
  }

  async getRevenueStats() {
    // Revenue last 6 months
    const stats: { name: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
  
        const result = await this.rentalBillRepository
          .createQueryBuilder('bill')
          .where('bill.status = :status', { status: RentalBillStatus.COMPLETED })
          .andWhere('bill.createdAt BETWEEN :start AND :end', { start, end })
          .select('SUM(bill.total)', 'sum')
          .getRawOne();
  
        stats.push({
          name: format(date, 'MM/yyyy'),
          revenue: parseFloat(result?.sum || '0'),
        });
      }
      return stats;
  }

  async getServiceUsageStats() {
    // Group by vehicle type
    const result = await this.rentalBillRepository
        .createQueryBuilder('bill')
        .select('bill.vehicleType', 'name')
        .addSelect('COUNT(bill.id)', 'value')
        .groupBy('bill.vehicleType')
        .getRawMany();
    
    // Parse count to int
    return result.map(item => ({
        name: item.name,
        value: parseInt(item.value, 10)
    }));
  }
}
