import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum BrandSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export enum BrandSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryBrandDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsEnum(BrandSortBy)
  sortBy = BrandSortBy.NAME;

  @IsOptional()
  @IsEnum(BrandSortDirection)
  sortDirection = BrandSortDirection.ASC;
}
