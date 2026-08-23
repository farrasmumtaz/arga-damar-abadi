import { IsIn } from 'class-validator';
import { QuotationStatus } from '../../../generated/prisma/enums';

export class QuotationDecisionDto {
  @IsIn([QuotationStatus.ACCEPTED, QuotationStatus.REJECTED])
  decision!: typeof QuotationStatus.ACCEPTED | typeof QuotationStatus.REJECTED;
}
