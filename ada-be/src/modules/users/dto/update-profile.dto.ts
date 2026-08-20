import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber('ID')
  @MaxLength(32)
  phone?: string;
}
