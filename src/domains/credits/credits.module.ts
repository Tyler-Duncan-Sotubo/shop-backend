import { Module } from '@nestjs/common';
import { CreditService } from './credits.service';

@Module({
  providers: [CreditService],
  exports: [CreditService], // ← exported so CampaignModule can inject it
})
export class CreditModule {}
