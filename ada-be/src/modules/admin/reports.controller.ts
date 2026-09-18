import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService, type ReportResource } from './reports.service';
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  private authorize(resource: string, user: AuthenticatedUser): ReportResource {
    if (!['orders', 'quotations', 'users', 'audit'].includes(resource))
      throw new BadRequestException('Unknown report');
    if (['users', 'audit'].includes(resource) && user.role === UserRole.STAFF)
      throw new ForbiddenException();
    return resource as ReportResource;
  }
  @Get(':resource')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('resource') resource: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reports.list(this.authorize(resource, user), query);
  }
  @Get(':resource/export')
  async csv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('resource') resource: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const name = this.authorize(resource, user);
    response.type('text/csv');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${name}-page-${query.page}.csv"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    return this.reports.csv(name, query);
  }
}
