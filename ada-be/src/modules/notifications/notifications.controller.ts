import {
  ConflictException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class NotificationQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional()
  @IsIn(['QUEUED', 'SENT', 'FAILED', 'CANCELLED'])
  status?: string;
}
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  @Get() async list(@Query() query: NotificationQueryDto) {
    const where = query.status ? { status: query.status } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          subject: true,
          recipient: true,
          channel: true,
          status: true,
          attempts: true,
          createdAt: true,
          nextAttemptAt: true,
          sentAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
        total,
      },
      workerEnabled: this.config.get<boolean>('NOTIFICATIONS_ENABLED', false),
      whatsappEnabled: this.config.get<boolean>('WHATSAPP_ENABLED', false),
    };
  }
  @Post(':id/retry') async retry(@Param('id', ParseUUIDPipe) id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, status: 'FAILED' },
      data: { status: 'QUEUED', attempts: 0, nextAttemptAt: new Date() },
    });
    if (updated.count !== 1)
      throw new ConflictException('Hanya notifikasi gagal yang dapat diulang');
    return { message: 'Notifikasi dijadwalkan kembali' };
  }
}
