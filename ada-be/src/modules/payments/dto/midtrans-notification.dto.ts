import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MidtransNotificationDto {
  @IsString() @MaxLength(50) order_id!: string;
  @IsString() @MaxLength(10) status_code!: string;
  @IsString() @MaxLength(30) gross_amount!: string;
  @IsString() @MaxLength(128) signature_key!: string;
  @IsString() @MaxLength(100) transaction_id!: string;
  @IsString() @MaxLength(50) transaction_status!: string;
  @IsOptional() @IsString() @MaxLength(50) fraud_status?: string;
  @IsOptional() @IsString() @MaxLength(50) payment_type?: string;
}
