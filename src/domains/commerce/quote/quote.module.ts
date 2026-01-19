import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { ApiKeysService } from 'src/domains/iam/api-keys/api-keys.service';
import { ManualOrdersService } from '../orders/manual-orders.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { InvoiceTotalsService } from 'src/domains/billing/invoice/invoice-totals.service';
import { StoresService } from '../stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [
    QuoteService,
    ApiKeysService,
    ManualOrdersService,
    InventoryStockService,
    InvoiceService,
    InventoryLocationsService,
    InventoryLedgerService,
    InvoiceTotalsService,
    StoresService,
    AwsService,
  ],
  exports: [QuoteService],
})
export class QuoteModule {}
