import { Module } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';

@Module({
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
