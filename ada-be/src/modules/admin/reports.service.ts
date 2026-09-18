import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  OrderStatus,
  QuotationStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { ReportQueryDto } from './dto/report-query.dto';
export interface ReportRow {
  id: string;
  reference: string;
  name: string;
  status: string;
  amount: string;
  createdAt: string;
}
export type ReportResource = 'orders' | 'quotations' | 'users' | 'audit';

export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@\-\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(resource: ReportResource, query: ReportQueryDto) {
    const pagination = {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' as const },
    };
    const search = query.search?.trim();
    let data: ReportRow[];
    let total: number;
    if (resource === 'orders') {
      if (
        query.status &&
        !Object.values(OrderStatus).includes(query.status as OrderStatus)
      )
        throw new BadRequestException('Invalid order status');
      const where = {
        ...(query.status ? { status: query.status as OrderStatus } : {}),
        ...(search
          ? {
              OR: [
                {
                  orderNumber: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  user: {
                    fullName: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              ],
            }
          : {}),
      };
      const [rows, count] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          ...pagination,
          where,
          include: { user: { select: { fullName: true } } },
        }),
        this.prisma.order.count({ where }),
      ]);
      total = count;
      data = rows.map((r) => ({
        id: r.id,
        reference: r.orderNumber,
        name: r.user.fullName,
        status: r.status,
        amount: r.total.toString(),
        createdAt: r.createdAt.toISOString(),
      }));
    } else if (resource === 'quotations') {
      if (
        query.status &&
        !Object.values(QuotationStatus).includes(
          query.status as QuotationStatus,
        )
      )
        throw new BadRequestException('Invalid quotation status');
      const where = {
        ...(query.status ? { status: query.status as QuotationStatus } : {}),
        ...(search
          ? {
              OR: [
                {
                  quotationNumber: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  projectName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      };
      const [rows, count] = await this.prisma.$transaction([
        this.prisma.quotation.findMany({ ...pagination, where }),
        this.prisma.quotation.count({ where }),
      ]);
      total = count;
      data = rows.map((r) => ({
        id: r.id,
        reference: r.quotationNumber,
        name: r.projectName,
        status: r.status,
        amount: '',
        createdAt: r.createdAt.toISOString(),
      }));
    } else if (resource === 'users') {
      if (
        query.status &&
        !Object.values(UserRole).includes(query.status as UserRole)
      )
        throw new BadRequestException('Invalid user role');
      const where = {
        ...(query.status ? { role: query.status as UserRole } : {}),
        ...(search
          ? {
              OR: [
                {
                  fullName: { contains: search, mode: 'insensitive' as const },
                },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      const [rows, count] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          ...pagination,
          where,
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        }),
        this.prisma.user.count({ where }),
      ]);
      total = count;
      data = rows.map((r) => ({
        id: r.id,
        reference: r.email,
        name: r.fullName,
        status: r.role,
        amount: r.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: r.createdAt.toISOString(),
      }));
    } else {
      const where = {
        ...(query.status ? { entityType: query.status } : {}),
        ...(search
          ? { action: { contains: search, mode: 'insensitive' as const } }
          : {}),
      };
      const [rows, count] = await this.prisma.$transaction([
        this.prisma.auditLog.findMany({
          ...pagination,
          where,
          include: { actor: { select: { fullName: true } } },
        }),
        this.prisma.auditLog.count({ where }),
      ]);
      total = count;
      data = rows.map((r) => ({
        id: r.id,
        reference: r.entityId ?? '',
        name: r.actor?.fullName ?? 'System',
        status: r.action,
        amount: r.entityType,
        createdAt: r.createdAt.toISOString(),
      }));
    }
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async csv(resource: ReportResource, query: ReportQueryDto): Promise<string> {
    const result = await this.list(resource, query);
    return (
      '\uFEFF' +
      [
        ['id', 'reference', 'name', 'status', 'amount', 'createdAt'],
        ...result.data.map((row) => [
          row.id,
          row.reference,
          row.name,
          row.status,
          row.amount,
          row.createdAt,
        ]),
      ]
        .map((row) => row.map(csvCell).join(','))
        .join('\r\n')
    );
  }
}
