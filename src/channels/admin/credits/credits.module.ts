// src/channels/admin/credits/credits.module.ts
import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditModule } from 'src/domains/credits/credits.module';

@Module({
  imports: [CreditModule], // ← CreditService is exported from here
  controllers: [CreditsController],
})
export class AdminCreditsModule {}
