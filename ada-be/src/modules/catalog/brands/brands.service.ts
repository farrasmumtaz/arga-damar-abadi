import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const slug = await this.createUniqueSlug(dto.slug ?? dto.name);

    try {
      return await this.prisma.brand.create({
        data: {
          name: dto.name.trim(),
          slug,
          logoUrl: dto.logoUrl ?? null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryBrandDto) {
    const where: Prisma.BrandWhereInput = {
      ...(query.search
        ? {
            name: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.isActive !== undefined
        ? { isActive: query.isActive === 'true' }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const orderBy: Prisma.BrandOrderByWithRelationInput = {
      [query.sortBy]: query.sortDirection,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      this.prisma.brand.count({ where }),
    ]);

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

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.ensureExists(id);
    const slug =
      dto.slug !== undefined
        ? await this.createUniqueSlug(dto.slug, id)
        : undefined;

    try {
      return await this.prisma.brand.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.logoUrl !== undefined
            ? { logoUrl: dto.logoUrl ?? null }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (brand._count.products > 0) {
      throw new ConflictException(
        'Brand cannot be deleted while it is used by products',
      );
    }

    try {
      await this.prisma.brand.delete({ where: { id } });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  private async ensureExists(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
  }

  private async createUniqueSlug(
    value: string,
    excludedId?: string,
  ): Promise<string> {
    const baseSlug = this.slugify(value);
    let slug = baseSlug;
    let suffix = 2;

    while (
      await this.prisma.brand.findFirst({
        where: {
          slug,
          ...(excludedId ? { id: { not: excludedId } } : {}),
        },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 130)
      .replace(/-+$/g, '');

    if (!slug) {
      throw new BadRequestException('Unable to generate brand slug');
    }

    return slug;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const rawTarget = error.meta?.target;
        const target = Array.isArray(rawTarget)
          ? rawTarget
              .filter((value): value is string => typeof value === 'string')
              .join(',')
          : typeof rawTarget === 'string'
            ? rawTarget
            : '';

        throw new ConflictException(
          target.includes('name')
            ? 'Brand name already exists'
            : 'Brand slug already exists',
        );
      }

      if (error.code === 'P2003') {
        throw new ConflictException(
          'Brand is still referenced by another resource',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Brand not found');
      }
    }

    throw error;
  }
}
