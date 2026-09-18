import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

export class AnalyticsQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(365) days = 30;
}

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get() summary(@Query() query: AnalyticsQueryDto) {
    return this.analytics.summary(query.days);
  }
}
