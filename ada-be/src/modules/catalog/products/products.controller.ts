import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductStatus, UserRole } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const catalogRoles = [UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN];

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findPublic(@Query() query: QueryProductDto) {
    return this.productsService.findAll(
      { ...query, status: ProductStatus.ACTIVE },
      true,
    );
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...catalogRoles)
  findAdmin(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query, false);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...catalogRoles)
  findOneAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOneById(id);
  }

  @Get(':slug')
  findOnePublic(@Param('slug') slug: string) {
    return this.productsService.findOneBySlug(slug);
  }

  @Get(':slug/recommendations')
  recommendations(@Param('slug') slug: string) {
    return this.productsService.recommendations(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...catalogRoles)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...catalogRoles)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
