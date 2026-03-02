import { Module } from '@nestjs/common';
import { ZohoService } from './zoho.service';
import { ZohoOAuthService } from './zoho-oauth.service';
import { ZohoBooksService } from './zoho-books.service';
import { ZohoInvoicesService } from './zoho-invoices.service';
import { ZohoCommonHelper } from './helpers/zoho-common.helper';
import { ZohoPollingCron } from './zoho-polling.cron';
@Module({
  providers: [
    ZohoService,
    ZohoOAuthService,
    ZohoBooksService,
    ZohoInvoicesService,
    ZohoCommonHelper,
    ZohoPollingCron,
  ],
  exports: [
    ZohoService,
    ZohoOAuthService,
    ZohoBooksService,
    ZohoInvoicesService,
    ZohoCommonHelper,
  ],
})
export class ZohoModule {}
