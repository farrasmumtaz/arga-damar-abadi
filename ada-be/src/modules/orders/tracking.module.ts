import {
  BadGatewayException,
  Body,
  ConflictException,
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, Matches, MaxLength } from 'class-validator';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Throttle } from '@nestjs/throttler';

class TrackingDto {
  @IsString() @MaxLength(120) @Matches(/^[a-zA-Z0-9_-]+$/) trackingId!: string;
}
interface TrackingEvent {
  status: string;
  note: string;
  updatedAt: string;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseTracking(
  value: unknown,
  waybill: string,
): { status: string; history: TrackingEvent[] } {
  if (
    !record(value) ||
    value.success !== true ||
    value.waybill_id !== waybill ||
    typeof value.status !== 'string' ||
    !Array.isArray(value.history)
  )
    throw new BadGatewayException(
      'Tracking response does not match this shipment',
    );
  const history = (value.history as unknown[]).slice(-100).flatMap((row) => {
    if (
      !record(row) ||
      typeof row.status !== 'string' ||
      typeof row.note !== 'string' ||
      typeof row.updated_at !== 'string' ||
      !Number.isFinite(Date.parse(row.updated_at))
    )
      return [];
    return [
      {
        status: row.status.slice(0, 50),
        note: row.note.slice(0, 1000),
        updatedAt: new Date(row.updated_at).toISOString(),
      },
    ];
  });
  return { status: value.status.slice(0, 50), history };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  @Get(':orderId/tracking')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async get(
    @Param('orderId', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, ...(user.role === 'CUSTOMER' ? { userId: user.id } : {}) },
      select: {
        trackingNumber: true,
        shippingProvider: true,
        shippingTrackingId: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const base = {
      waybill: order.trackingNumber,
      courier: order.shippingProvider,
      history: [] as TrackingEvent[],
    };
    if (!order.trackingNumber)
      return {
        ...base,
        status: 'NOT_SHIPPED',
        message: 'Pesanan belum memiliki resi.',
      };
    const key = this.config.get<string>('BITESHIP_API_KEY');
    if (!key || !order.shippingTrackingId)
      return {
        ...base,
        status: 'MANUAL',
        message: 'Resi tersedia. Tracking otomatis belum terhubung.',
      };
    try {
      const response = await fetch(
        `https://api.biteship.com/v1/trackings/${encodeURIComponent(order.shippingTrackingId)}`,
        {
          headers: { Authorization: key },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) throw new Error('provider');
      return {
        ...base,
        ...parseTracking(await response.json(), order.trackingNumber),
        message: 'Status dari kurir; status order diproses terpisah oleh toko.',
      };
    } catch {
      throw new BadGatewayException('Tracking kurir sementara tidak tersedia');
    }
  }
  @Patch('admin/:orderId/tracking')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN', 'SUPER_ADMIN')
  async update(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: TrackingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED')
        throw new ConflictException(
          'Tambahkan resi melalui fulfillment terlebih dahulu',
        );
      await tx.order.update({
        where: { id: orderId },
        data: { shippingTrackingId: dto.trackingId },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'SHIPPING_TRACKING_LINKED',
          entityType: 'Order',
          entityId: orderId,
        },
      });
      return { message: 'Tracking ID tersimpan' };
    });
  }
}
@Module({ controllers: [TrackingController] })
export class TrackingModule {}
