import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ProductStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: {
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
          inventory: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const cart = await this.ensureCart(userId);
    const populated = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: cartInclude,
    });
    const subtotal = populated.items.reduce(
      (total, item) => total.plus(item.product.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      ...populated,
      subtotal: subtotal.toFixed(2),
      itemCount: populated.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const [cart, product] = await Promise.all([
      this.ensureCart(userId),
      this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          status: true,
          inventory: { select: { quantity: true, reserved: true } },
        },
      }),
    ]);
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Active product not found');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId: product.id },
      },
      select: { quantity: true },
    });
    const requestedQuantity = (existing?.quantity ?? 0) + dto.quantity;
    this.assertStock(product.inventory, requestedQuantity);

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId: product.id },
      },
      create: {
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
      },
      update: { quantity: requestedQuantity },
    });
    return this.findMine(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const item = await this.findOwnedItem(userId, itemId);
    this.assertStock(item.product.inventory, quantity);
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
    return this.findMine(userId);
  }

  async removeItem(userId: string, itemId: string) {
    await this.findOwnedItem(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.findMine(userId);
  }

  async clear(userId: string): Promise<void> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!cart) return;
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  private async ensureCart(userId: string): Promise<{ id: string }> {
    const existing = await this.prisma.cart.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (existing) return existing;

    try {
      return await this.prisma.cart.create({
        data: { userId },
        select: { id: true },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentCart = await this.prisma.cart.findFirst({
          where: { userId },
          select: { id: true },
        });
        if (concurrentCart) return concurrentCart;
      }
      throw error;
    }
  }

  private async findOwnedItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: {
        product: {
          select: {
            inventory: { select: { quantity: true, reserved: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    return item;
  }

  private assertStock(
    inventory: { quantity: number; reserved: number } | null,
    requestedQuantity: number,
  ): void {
    const available = inventory
      ? Math.max(0, inventory.quantity - inventory.reserved)
      : 0;
    if (requestedQuantity > available) {
      throw new ConflictException(`Only ${available} item(s) available`);
    }
  }
}
