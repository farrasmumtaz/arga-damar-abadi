import { IsUUID } from 'class-validator';
export class ConvertQuotationDto {
  @IsUUID() addressId!: string;
}
