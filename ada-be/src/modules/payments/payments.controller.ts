import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { PaymentsService } from './payments.service';
import { Throttle } from '@nestjs/throttler';
import { MidtransWebhookPipe } from './midtrans-webhook.pipe';
import { RefundDto } from './dto/refund.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../../generated/prisma/enums';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/session')
  @UseGuards(JwtAuthGuard)
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.paymentsService.createSession(user.id, orderId);
  }

  @Post('webhooks/midtrans')
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  handleNotification(@Body(MidtransWebhookPipe) dto: unknown) {
    return this.paymentsService.handleNotification(
      dto as MidtransNotificationDto,
    );
  }

  @Post('orders/:orderId/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() dto: RefundDto,
  ) {
    return this.paymentsService.refund(orderId, user.id, dto);
  }
}
