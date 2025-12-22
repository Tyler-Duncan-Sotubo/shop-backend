import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CartService } from '../cart/cart.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ShippingRatesService } from '../../fulfillment/shipping/services/shipping-rates.service';
import { ShippingZonesService } from '../../fulfillment/shipping/services/shipping-zones.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { StorefrontCheckoutController } from './storefront-checkout.controller';
import { ApiKeysService } from '../../iam/api-keys/api-keys.service';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { InvoiceService } from 'src/modules/billing/invoice/invoice.service';
import { InvoiceTotalsService } from 'src/modules/billing/invoice/invoice-totals.service';

@Module({
  controllers: [CheckoutController, StorefrontCheckoutController],
  providers: [
    CheckoutService,
    CartService,
    InventoryStockService,
    ShippingRatesService,
    ShippingZonesService,
    InventoryLocationsService,
    ApiKeysService,
    InventoryLedgerService,
    InvoiceService,
    InvoiceTotalsService,
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
