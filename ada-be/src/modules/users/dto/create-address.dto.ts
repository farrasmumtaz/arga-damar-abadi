import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsPhoneNumber,
  IsPostalCode,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAddressDto {
  @IsString() @MinLength(1) @MaxLength(50) @Transform(trim) label!: string;
  @IsString() @MinLength(2) @MaxLength(150) @Transform(trim) recipient!: string;
  @IsPhoneNumber('ID') @MaxLength(32) phone!: string;
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  @Transform(trim)
  addressLine!: string;
  @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) province!: string;
  @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) city!: string;
  @IsString() @MinLength(2) @MaxLength(100) @Transform(trim) district!: string;
  @IsPostalCode('ID') @MaxLength(10) postalCode!: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
