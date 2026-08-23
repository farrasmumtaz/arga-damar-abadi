import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { QuotationStatus } from '../../../generated/prisma/enums';

class QuotedItemDto {
  @IsUUID() id!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() unitPrice!: number;
}
export class UpdateQuotationDto {
  @IsEnum(QuotationStatus) status!: QuotationStatus;
  @IsOptional() @Type(() => Date) @IsDate() validUntil?: Date;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotedItemDto)
  items?: QuotedItemDto[];
}
