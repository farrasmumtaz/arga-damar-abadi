import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
export class CreateQuotationItemDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  @Transform(trim)
  description!: string;
  @IsInt() @Min(1) quantity!: number;
}
export class CreateQuotationDto {
  @IsOptional() @IsUUID() attachmentId?: string;
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(trim)
  projectName!: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trim)
  companyName?: string;
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Transform(trim)
  contactName!: string;
  @IsPhoneNumber('ID') @MaxLength(32) contactPhone!: string;
  @IsOptional() @IsString() @MaxLength(1000) @Transform(trim) notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[];
}
