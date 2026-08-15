import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    await this.validateParent(dto.parentId);

    const slug = await this.createUniqueSlug(dto.slug ?? dto.name);

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug,
          parentId: dto.parentId ?? null,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryCategoryDto) {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.CategoryWhereInput = {
      ...(query.search
        ? {
            name: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.rootOnly === 'true' ? { parentId: null } : {}),
      ...(query.isActive !== undefined
        ? { isActive: query.isActive === 'true' }
        : {}),
    };

    const orderBy: Prisma.CategoryOrderByWithRelationInput = {
      [query.sortBy]: query.sortDirection,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              children: true,
              products: true,
            },
          },
        },
      }),
      this.prisma.category.count({ where }),
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            sortOrder: true,
          },
        },
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.parentId !== undefined) {
      await this.validateParent(dto.parentId, id);
    }

    const slug =
      dto.slug !== undefined
        ? await this.createUniqueSlug(dto.slug, id)
        : undefined;

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.parentId !== undefined
            ? { parentId: dto.parentId ?? null }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.children > 0) {
      throw new ConflictException(
        'Category cannot be deleted while it has child categories',
      );
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        'Category cannot be deleted while it is used by products',
      );
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  private async validateParent(
    parentId?: string | null,
    categoryId?: string,
  ): Promise<void> {
    if (!parentId) {
      return;
    }

    if (parentId === categoryId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    let currentId: string | null = parentId;
    const visitedIds = new Set<string>();

    while (currentId) {
      if (visitedIds.has(currentId)) {
        throw new BadRequestException('Invalid category hierarchy');
      }

      visitedIds.add(currentId);

      const category: { id: string; parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: {
            id: true,
            parentId: true,
          },
        });

      if (!category) {
        throw new BadRequestException('Parent category not found');
      }

      if (category.id === categoryId) {
        throw new BadRequestException(
          'Parent category would create a circular hierarchy',
        );
      }

      currentId = category.parentId;
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
      await this.prisma.category.findFirst({
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
      throw new BadRequestException('Unable to generate category slug');
    }

    return slug;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Category slug already exists');
      }

      if (error.code === 'P2003') {
        throw new ConflictException(
          'Category is still referenced by another resource',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
    }

    throw error;
  }
}
