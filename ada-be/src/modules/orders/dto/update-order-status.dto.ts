import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/enums';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @ValidateIf((dto: UpdateOrderStatusDto) => dto.status === OrderStatus.SHIPPED)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  shippingProvider?: string;
  @ValidateIf((dto: UpdateOrderStatusDto) => dto.status === OrderStatus.SHIPPED)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  trackingNumber?: string;
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  note?: string;
}
