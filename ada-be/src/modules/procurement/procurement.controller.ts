import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  ProcurementQueryDto,
  PurchaseOrderDto,
  SupplierDto,
} from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

@Controller('procurement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}
  @Get('suppliers') suppliers(@Query() query: ProcurementQueryDto) {
    return this.service.suppliers(query);
  }
  @Get('suppliers/:id') supplier(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.supplier(id);
  }
  @Post('suppliers') createSupplier(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SupplierDto,
  ) {
    return this.service.saveSupplier(user.id, dto);
  }
  @Patch('suppliers/:id') updateSupplier(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SupplierDto,
  ) {
    return this.service.saveSupplier(user.id, dto, id);
  }
  @Delete('suppliers/:id') deleteSupplier(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.removeSupplier(user.id, id);
  }
  @Get('orders') orders(@Query() query: ProcurementQueryDto) {
    return this.service.orders(query);
  }
  @Get('orders/:id') order(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.order(id);
  }
  @Post('orders') createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PurchaseOrderDto,
  ) {
    return this.service.saveOrder(user.id, dto);
  }
  @Patch('orders/:id') updateOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PurchaseOrderDto,
  ) {
    return this.service.saveOrder(user.id, dto, id);
  }
  @Post('orders/:id/issue') issue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.transition(user.id, id, 'issue');
  }
  @Post('orders/:id/receive') receive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.transition(user.id, id, 'receive');
  }
  @Post('orders/:id/cancel') cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.transition(user.id, id, 'cancel');
  }
}
