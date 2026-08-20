import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CheckoutDto } from './dto/checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryOrderDto,
  ) {
    return this.ordersService.findMine(user.id, query);
  }

  @Get(':orderId')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.ordersService.findOne(user.id, orderId);
  }

  @Post(':orderId/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.ordersService.cancel(user.id, orderId);
  }
}
