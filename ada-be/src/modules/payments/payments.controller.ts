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
  handleNotification(@Body() dto: MidtransNotificationDto) {
    return this.paymentsService.handleNotification(dto);
  }
}
