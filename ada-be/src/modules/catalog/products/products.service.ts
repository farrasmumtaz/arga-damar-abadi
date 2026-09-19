import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ProductStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { adjustWarehouseStock } from '../../warehouses/warehouse-stock';

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  inventory: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    await this.validateRelations(dto.categoryId, dto.brandId);
    const slug = await this.createUniqueSlug(dto.slug ?? dto.name);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            categoryId: dto.categoryId,
            brandId: dto.brandId ?? null,
            sku: dto.sku.trim().toUpperCase(),
            name: dto.name.trim(),
            slug,
            shortDescription: dto.shortDescription?.trim() ?? null,
            description: dto.description?.trim() ?? null,
            specifications: this.toJson(dto.specifications),
            price: new Prisma.Decimal(dto.price),
            weightGram: dto.weightGram ?? 0,
            status: dto.status ?? ProductStatus.DRAFT,
            isFeatured: dto.isFeatured ?? false,
            images: dto.images?.length
              ? {
                  create: dto.images.map((image, index) => ({
                    url: image.url,
                    altText: image.altText?.trim() ?? dto.name.trim(),
                    sortOrder: image.sortOrder ?? index,
                  })),
                }
              : undefined,
            inventory: {
              create: {
                quantity: dto.initialStock ?? 0,
                lowStockLevel: dto.lowStockLevel ?? 5,
              },
            },
          },
          include: productInclude,
        });
        await adjustWarehouseStock(tx, product.id, dto.initialStock ?? 0);
        return product;
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryProductDto, publicOnly: boolean) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice cannot exceed maxPrice');
    }

    const where: Prisma.ProductWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              { sku: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(publicOnly
        ? { status: ProductStatus.ACTIVE }
        : query.status
          ? { status: query.status }
          : {}),
      ...(query.isFeatured !== undefined
        ? { isFeatured: query.isFeatured === 'true' }
        : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [query.sortBy]: query.sortDirection,
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        include: productInclude,
      }),
      this.prisma.product.count({ where }),
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

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async recommendations(slug: string) {
    const source = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE },
      select: { id: true, categoryId: true, brandId: true },
    });
    if (!source) throw new NotFoundException('Product not found');
    // Category/status index bounds candidates; SQL compares stock columns before LIMIT.
    const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id FROM products p JOIN inventories i ON i.product_id = p.id
      WHERE p.category_id = ${source.categoryId}::uuid AND p.status = 'ACTIVE'
        AND p.id <> ${source.id}::uuid AND i.quantity > i.reserved
      ORDER BY (p.brand_id = ${source.brandId}::uuid) DESC NULLS LAST, p.is_featured DESC, p.created_at DESC, p.id
      LIMIT 4`;
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: ids.map((row) => row.id) },
        status: ProductStatus.ACTIVE,
      },
      include: productInclude,
    });
    return ids.flatMap((row) => {
      const product = products.find((p) => p.id === row.id);
      return product ? [product] : [];
    });
  }

  async findOneById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOneById(id);
    if (dto.categoryId !== undefined || dto.brandId !== undefined) {
      await this.validateRelations(dto.categoryId, dto.brandId);
    }
    const slug =
      dto.slug !== undefined
        ? await this.createUniqueSlug(dto.slug, id)
        : undefined;

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
          ...(dto.sku !== undefined
            ? { sku: dto.sku.trim().toUpperCase() }
            : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.shortDescription !== undefined
            ? { shortDescription: dto.shortDescription.trim() || null }
            : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
          ...(dto.specifications !== undefined
            ? { specifications: this.toJson(dto.specifications) }
            : {}),
          ...(dto.price !== undefined
            ? { price: new Prisma.Decimal(dto.price) }
            : {}),
          ...(dto.weightGram !== undefined
            ? { weightGram: dto.weightGram }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.isFeatured !== undefined
            ? { isFeatured: dto.isFeatured }
            : {}),
          ...(dto.images !== undefined
            ? {
                images: {
                  deleteMany: {},
                  create: dto.images.map((image, index) => ({
                    url: image.url,
                    altText:
                      image.altText?.trim() ?? dto.name?.trim() ?? 'Product',
                    sortOrder: image.sortOrder ?? index,
                  })),
                },
              }
            : {}),
          ...(dto.initialStock !== undefined || dto.lowStockLevel !== undefined
            ? {
                inventory: {
                  upsert: {
                    create: {
                      quantity: dto.initialStock ?? 0,
                      lowStockLevel: dto.lowStockLevel ?? 5,
                    },
                    update: {
                      ...(dto.initialStock !== undefined
                        ? { quantity: dto.initialStock }
                        : {}),
                      ...(dto.lowStockLevel !== undefined
                        ? { lowStockLevel: dto.lowStockLevel }
                        : {}),
                    },
                  },
                },
              }
            : {}),
        },
        include: productInclude,
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: { cartItems: true, orderItems: true, quotationItems: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    const references =
      product._count.cartItems +
      product._count.orderItems +
      product._count.quotationItems;
    if (references > 0) {
      throw new ConflictException(
        'Product cannot be deleted while referenced by transactions',
      );
    }

    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  private async validateRelations(
    categoryId?: string,
    brandId?: string | null,
  ): Promise<void> {
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { isActive: true },
      });
      if (!category?.isActive) {
        throw new BadRequestException('Active category not found');
      }
    }
    if (brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: brandId },
        select: { isActive: true },
      });
      if (!brand?.isActive) {
        throw new BadRequestException('Active brand not found');
      }
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
      await this.prisma.product.findFirst({
        where: {
          slug,
          ...(excludedId ? { id: { not: excludedId } } : {}),
        },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix++}`;
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
      .slice(0, 210)
      .replace(/-+$/g, '');
    if (!slug) throw new BadRequestException('Unable to generate product slug');
    return slug;
  }

  private toJson(value?: Record<string, unknown>): Prisma.InputJsonObject {
    return (value ?? {}) as Prisma.InputJsonObject;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Product SKU or slug already exists');
      }
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Product is still referenced by another resource',
        );
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
    }
    throw error;
  }
}
