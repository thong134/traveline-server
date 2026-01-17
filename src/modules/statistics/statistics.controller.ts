import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { UserRole } from '../user/enums/user-role.enum';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Statistics')
@Controller('statistics')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get dashboard summary counts' })
  async getDashboardSummary() {
    return this.statisticsService.getDashboardSummary();
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth statistics' })
  async getUserGrowthStats(@Query('period') period: 'year' | 'month' = 'year') {
    return this.statisticsService.getUserGrowthStats(period);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  async getRevenueStats() {
    return this.statisticsService.getRevenueStats();
  }

  @Get('service-usage')
  @ApiOperation({ summary: 'Get service usage statistics' })
  async getServiceUsageStats() {
    return this.statisticsService.getServiceUsageStats();
  }
}
