import {
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { ShippingCostService } from './shipping-cost.service';

class ShippingQueryDto {
  @IsUUID() addressId!: string;
  @IsOptional() @IsUUID() productId?: string;
}
@Controller('shipping')
@UseGuards(JwtAuthGuard)
export class ShippingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: ShippingCostService,
  ) {}
  @Get('quote')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async quote(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ShippingQueryDto,
  ) {
    const address = await this.prisma.address.findFirst({
      where: { id: query.addressId, userId: user.id },
    });
    if (!address) throw new NotFoundException('Address not found');
    const cart = await this.prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });
    const items = (cart?.items ?? []).map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));
    if (query.productId) {
      const existing = items.find(
        (item) => item.product.id === query.productId,
      );
      if (existing) existing.quantity += 1;
      else {
        const product = await this.prisma.product.findFirst({
          where: { id: query.productId, status: 'ACTIVE' },
        });
        if (!product) throw new NotFoundException('Product not found');
        items.push({ product, quantity: 1 });
      }
    }
    if (!items.length || items.some((item) => item.product.status !== 'ACTIVE'))
      throw new ConflictException(
        'Keranjang kosong atau memiliki produk nonaktif',
      );
    const weight = items.reduce(
      (sum, item) => sum + item.product.weightGram * item.quantity,
      0,
    );
    const value = items.reduce(
      (sum, item) => sum.plus(item.product.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    return this.shipping.quote(
      weight,
      value.toString(),
      user.id,
      address.id,
      address.postalCode,
    );
  }
}
