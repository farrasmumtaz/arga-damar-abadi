import { Module } from '@nestjs/common';
import { AdminDashboardController } from './dashboard.controller';
import { AdminDashboardService } from './dashboard.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [
    AdminDashboardController,
    ReportsController,
    AnalyticsController,
  ],
  providers: [AdminDashboardService, ReportsService, AnalyticsService],
})
export class AdminModule {}
