import { Module } from '@nestjs/common';
import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [BrandsModule, CategoriesModule],
})
export class CatalogModule {}
