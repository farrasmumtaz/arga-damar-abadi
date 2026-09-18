import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    // Group in SQL; never load the complete order/item history into application memory.
    const [
      orders,
      payments,
      quotations,
      daily,
      topProducts,
      inventory,
      leadTime,
    ] = await this.prisma.$transaction([
      this.prisma.$queryRaw<
        Array<{ status: string; count: number; total: string }>
      >`SELECT status::text, COUNT(*)::int AS count, SUM(total)::text AS total FROM orders WHERE created_at >= ${since} GROUP BY status ORDER BY status`,
      this.prisma.$queryRaw<
        Array<{ status: string; count: number }>
      >`SELECT status::text, COUNT(*)::int AS count FROM payments WHERE created_at >= ${since} GROUP BY status ORDER BY status`,
      this.prisma.$queryRaw<
        Array<{ status: string; count: number }>
      >`SELECT status::text, COUNT(*)::int AS count FROM quotations WHERE created_at >= ${since} GROUP BY status ORDER BY status`,
      this.prisma.$queryRaw<
        Array<{ day: string; orders: number; revenue: string }>
      >`
        SELECT to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
          COUNT(*)::int AS orders, SUM(total)::text AS revenue
        FROM orders WHERE created_at >= ${since} AND status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY day ORDER BY day`,
      this.prisma.$queryRaw<
        Array<{
          productId: string;
          name: string;
          quantity: number;
          grossSales: string;
        }>
      >`
        SELECT i.product_id AS "productId", MAX(i.product_name) AS name, SUM(i.quantity)::int AS quantity,
          SUM(i.subtotal)::text AS "grossSales"
        FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE o.created_at >= ${since} AND o.status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY i.product_id ORDER BY SUM(i.subtotal) DESC, i.product_id LIMIT 10`,
      this.prisma.$queryRaw<
        Array<{ lowStock: number; stockouts: number; adjustmentDelta: string }>
      >`
        SELECT COUNT(*) FILTER (WHERE quantity - reserved <= low_stock_level)::int AS "lowStock",
          COUNT(*) FILTER (WHERE quantity - reserved <= 0)::int AS stockouts,
          (SELECT COALESCE(SUM(quantity_delta),0)::text FROM stock_movements WHERE created_at >= ${since} AND type = 'ADJUSTMENT') AS "adjustmentDelta"
        FROM inventories`,
      this.prisma.$queryRaw<Array<{ medianHours: number | null }>>`
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (delivered_at - created_at))/3600)::float8 AS "medianHours"
        FROM orders WHERE created_at >= ${since} AND status = 'DELIVERED' AND delivered_at IS NOT NULL`,
    ]);
    return {
      since: since.toISOString(),
      days,
      orders,
      payments,
      quotations,
      daily,
      topProducts,
      inventory: inventory[0],
      medianFulfillmentHours: leadTime[0]?.medianHours ?? null,
    };
  }
}
