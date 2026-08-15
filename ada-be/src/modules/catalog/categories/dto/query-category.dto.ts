import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum CategorySortBy {
  NAME = 'name',
  SORT_ORDER = 'sortOrder',
  CREATED_AT = 'createdAt',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBooleanString()
  rootOnly?: string;

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
  @IsEnum(CategorySortBy)
  sortBy = CategorySortBy.SORT_ORDER;

  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection = SortDirection.ASC;
}
