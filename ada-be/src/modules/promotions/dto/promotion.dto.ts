import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountKind } from '../../../generated/prisma/enums';

export class PromotionCodeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{2,39}$/)
  code!: string;
}

export class PreviewPromotionDto extends PromotionCodeDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class CreatePromotionDto extends PromotionCodeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsEnum(DiscountKind)
  kind!: DiscountKind;

  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/)
  amount!: string;

  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/)
  minSubtotal!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/)
  maxDiscount?: string | null;

  @IsDateString({ strict: true })
  startsAt!: string;

  @IsDateString({ strict: true })
  endsAt!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimit!: number;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  perUserLimit!: number;
}

// The code itself is immutable after creation (enforced by the service).
export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}

export class QueryPromotionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;
}
