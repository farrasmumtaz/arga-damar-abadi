import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  ProductStatus,
  QuotationStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

interface CountRow {
  count: bigint;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async getDashboard() {
    const [
      customers,
      activeProducts,
      pendingOrders,
      openQuotations,
      revenue,
      lowStockRows,
      recentOrders,
      recentQuotations,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.order.count({
        where: { status: OrderStatus.PENDING_PAYMENT },
      }),
      this.prisma.quotation.count({
        where: {
          status: {
            in: [QuotationStatus.SUBMITTED, QuotationStatus.REVIEWING],
          },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.PROCESSING,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
            ],
          },
        },
        _sum: { total: true },
      }),
      this.prisma.$queryRaw<
        CountRow[]
      >`SELECT COUNT(*) AS "count" FROM "inventories" WHERE ("quantity" - "reserved") <= "low_stock_level"`,
      this.prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.quotation.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    return {
      metrics: {
        customers,
        activeProducts,
        pendingOrders,
        openQuotations,
        lowStock: Number(lowStockRows[0]?.count ?? 0),
        revenue: revenue._sum.total?.toFixed(2) ?? '0.00',
      },
      recentOrders,
      recentQuotations,
    };
  }
}
