import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationDecisionDto } from './dto/quotation-decision.dto';
import { QuotationsService } from './quotations.service';
import { QuotationOrderService } from './quotation-order.service';
import { ConvertQuotationDto } from './dto/convert-quotation.dto';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(
    private readonly service: QuotationsService,
    private readonly conversion: QuotationOrderService,
  ) {}
  @Post(':id/order')
  convert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConvertQuotationDto,
  ) {
    return this.conversion.convert(user.id, id, dto.addressId);
  }
  @Post() create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.service.create(user.id, dto);
  }
  @Get() findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user.id);
  }
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAdmin() {
    return this.service.findAdmin();
  }
  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOneAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOneAdmin(id);
  }
  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.service.update(id, dto);
  }
  @Post(':id/decision')
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: QuotationDecisionDto,
  ) {
    return this.service.decide(user.id, id, dto.decision);
  }
  @Get(':id') findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.findOne(user.id, id);
  }
}
