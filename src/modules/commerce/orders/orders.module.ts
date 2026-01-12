import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { ManualOrdersService } from './manual-orders.service';
import { InvoiceService } from 'src/modules/billing/invoice/invoice.service';
import { InvoiceTotalsService } from 'src/modules/billing/invoice/invoice-totals.service';
import { StorefrontOrdersController } from './storefront-orders.controller';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';
import { StoresService } from '../stores/stores.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [OrdersController, StorefrontOrdersController],
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
  ],
})
export class OrdersModule {}
