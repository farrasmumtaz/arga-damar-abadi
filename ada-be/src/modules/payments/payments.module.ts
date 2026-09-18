import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MidtransClient } from './midtrans.client';
import { MaintenanceService } from './maintenance.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MidtransClient, MaintenanceService],
  exports: [PaymentsService, MidtransClient],
})
export class PaymentsModule {}
