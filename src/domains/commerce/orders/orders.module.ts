import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { ManualOrdersService } from './manual-orders.service';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';
import { InvoiceTotalsService } from 'src/domains/billing/invoice/invoice-totals.service';
import { ApiKeysService } from 'src/domains/iam/api-keys/api-keys.service';
import { StoresService } from '../stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { ZohoBooksService } from 'src/domains/integration/zoho/zoho-books.service';
import { ZohoService } from 'src/domains/integration/zoho/zoho.service';
import { ZohoCommonHelper } from 'src/domains/integration/zoho/helpers/zoho-common.helper';

@Module({
  providers: [
    OrdersService,
    InventoryStockService,
    InventoryLocationsService,
    InventoryLedgerService,
    ManualOrdersService,
    InvoiceService,
    InvoiceTotalsService,
    ApiKeysService,
    StoresService,
    AwsService,
    ZohoBooksService,
    ZohoService,
    ZohoCommonHelper,
  ],
  exports: [OrdersService, ManualOrdersService],
})
export class OrdersModule {}
