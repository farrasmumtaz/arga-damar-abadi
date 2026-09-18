import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class RefundDto {
  @IsString() @IsNotEmpty() @MaxLength(255) reason!: string;
  @IsBoolean() restock!: boolean;
}
