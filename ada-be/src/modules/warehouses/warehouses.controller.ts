import {
  Body,
  Controller,
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
  TransferStockDto,
  WarehouseDto,
  WarehouseQueryDto,
} from './dto/warehouses.dto';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}
  @Get() list(@Query() query: WarehouseQueryDto) {
    return this.service.list(query);
  }
  @Get('stocks') stocks(@Query() query: WarehouseQueryDto) {
    return this.service.stocks(query);
  }
  @Get('transfers') transfers(@Query() query: WarehouseQueryDto) {
    return this.service.transfers(query);
  }
  @Post() @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WarehouseDto,
  ) {
    return this.service.save(user.id, dto);
  }
  @Patch(':id') @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WarehouseDto,
  ) {
    return this.service.save(user.id, dto, id);
  }
  @Post('transfers') transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferStockDto,
  ) {
    return this.service.transfer(user.id, dto);
  }
}
