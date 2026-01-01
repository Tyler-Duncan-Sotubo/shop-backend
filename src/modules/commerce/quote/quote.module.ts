import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';
import { ManualOrdersService } from '../orders/manual-orders.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { InvoiceService } from 'src/modules/billing/invoice/invoice.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { InvoiceTotalsService } from 'src/modules/billing/invoice/invoice-totals.service';

@Module({
  controllers: [QuoteController],
  providers: [
    QuoteService,
    ApiKeysService,
    ManualOrdersService,
    InventoryStockService,
    InvoiceService,
    InventoryLocationsService,
    InventoryLedgerService,
    InvoiceTotalsService,
  ],
})
export class QuoteModule {}
