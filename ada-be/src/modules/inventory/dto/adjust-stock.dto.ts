import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsUUID,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';

export class AdjustStockDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  @NotEquals(0)
  quantityDelta!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason!: string;
}
