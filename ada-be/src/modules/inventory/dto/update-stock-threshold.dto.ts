import { IsInt, Max, Min } from 'class-validator';

export class UpdateStockThresholdDto {
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  lowStockLevel!: number;
}
