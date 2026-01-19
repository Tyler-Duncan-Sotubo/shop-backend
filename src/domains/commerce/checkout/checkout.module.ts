import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ShippingRatesService } from '../../fulfillment/shipping/services/shipping-rates.service';
import { ShippingZonesService } from '../../fulfillment/shipping/services/shipping-zones.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { ApiKeysService } from '../../iam/api-keys/api-keys.service';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';
import { InvoiceTotalsService } from 'src/domains/billing/invoice/invoice-totals.service';
import { StoresService } from '../stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { CheckoutPaymentsService } from './checkout-payment.service';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [CartModule],
  providers: [
    CheckoutService,
    InventoryStockService,
    ShippingRatesService,
    ShippingZonesService,
    InventoryLocationsService,
    ApiKeysService,
    InventoryLedgerService,
    InvoiceService,
    InvoiceTotalsService,
    StoresService,
    AwsService,
    CheckoutPaymentsService,
  ],
  exports: [CheckoutService, CheckoutPaymentsService],
})
export class CheckoutModule {}
