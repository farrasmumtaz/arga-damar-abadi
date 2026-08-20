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
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { UpdateStockThresholdDto } from './dto/update-stock-threshold.dto';
import { InventoryService } from './inventory.service';

const inventoryRoles = [UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN];

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...inventoryRoles)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':productId')
  findOne(@Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.inventoryService.findOne(productId);
  }

  @Get(':productId/movements')
  findMovements(@Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.inventoryService.findMovements(productId);
  }

  @Post(':productId/adjustments')
  adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjust(productId, user.id, dto);
  }

  @Patch(':productId/threshold')
  updateThreshold(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: UpdateStockThresholdDto,
  ) {
    return this.inventoryService.updateThreshold(productId, dto.lowStockLevel);
  }
}
