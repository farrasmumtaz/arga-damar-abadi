import { ShippingController } from './shipping.controller';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ShippingCostService } from './shipping-cost.service';
import { PromotionsService } from '../promotions/promotions.service';
import { Prisma } from '../../generated/prisma/client';
import { UserRole } from '../../generated/prisma/enums';

describe('Checkout quote', () => {
  const product = {
    id: 'product',
    status: 'ACTIVE',
    price: new Prisma.Decimal('1000.25'),
    weightGram: 500,
  };
  const prisma = {
    address: { findFirst: jest.fn() },
    cart: { findUnique: jest.fn() },
    product: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const shipping = { quote: jest.fn() };
  const promotions = { evaluate: jest.fn() };
  const user = {
    id: 'user',
    email: 'customer@example.com',
    fullName: 'Customer',
    role: UserRole.CUSTOMER,
  };
  const controller = new ShippingController(
    prisma as unknown as PrismaService,
    shipping as unknown as ShippingCostService,
    promotions as unknown as PromotionsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.address.findFirst.mockResolvedValue({
      id: 'address',
      postalCode: '12345',
    });
    prisma.cart.findUnique.mockResolvedValue({
      items: [{ product, quantity: 2 }],
    });
    prisma.$transaction.mockImplementation(
      (callback: (tx: object) => Promise<unknown>) => callback({}),
    );
    shipping.quote.mockResolvedValue({
      amount: 20000,
      provider: 'INTERNAL',
      token: 'signed',
      expiresAt: '2030-01-01T00:00:00Z',
    });
    promotions.evaluate.mockResolvedValue({
      discountAmount: new Prisma.Decimal(100),
    });
  });

  it('returns server-calculated subtotal, discount, shipping and exact decimal total', async () => {
    const result = await controller.quote(user, {
      addressId: 'address',
      promotionCode: 'HEMAT',
    });
    expect(result).toMatchObject({
      subtotal: '2000.50',
      discountAmount: '100.00',
      amount: 20000,
      total: '21900.50',
    });
    expect(promotions.evaluate).toHaveBeenCalledWith(
      {},
      'HEMAT',
      'user',
      new Prisma.Decimal('2000.50'),
      false,
    );
  });

  it('includes the direct-purchase unit and does not consume voucher quota', async () => {
    const result = await controller.quote(user, {
      addressId: 'address',
      productId: 'product',
    });
    expect(result.subtotal).toBe('3000.75');
    expect(result.total).toBe('23000.75');
    expect(promotions.evaluate).not.toHaveBeenCalled();
  });

  it('does not quote another customer address', async () => {
    prisma.address.findFirst.mockResolvedValue(null);
    await expect(
      controller.quote(user, { addressId: 'foreign' }),
    ).rejects.toThrow('Address not found');
    expect(shipping.quote).not.toHaveBeenCalled();
  });
});
