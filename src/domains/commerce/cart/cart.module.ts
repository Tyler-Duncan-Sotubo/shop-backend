import { Module } from '@nestjs/common';
import { CheckoutService } from '../checkout/checkout.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ShippingRatesService } from '../../fulfillment/shipping/services/shipping-rates.service';
import { ShippingZonesService } from '../../fulfillment/shipping/services/shipping-zones.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { JwtService } from '@nestjs/jwt';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';
import { InvoiceTotalsService } from 'src/domains/billing/invoice/invoice-totals.service';
import { StoresService } from '../stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { CartService } from './cart.service';
import { CartQueryService } from './services/cart-query.service';
import { CartLifecycleService } from './services/cart-lifecycle.service';
import { CartTokenService } from './services/cart-token.service';
import { CartItemMutationService } from './services/cart-item-mutation.service';
import { CartTotalsService } from './services/cart-totals.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [
    CartService,
    CartQueryService,
    CartLifecycleService,
    CartTokenService,
    CartItemMutationService,
    CartTotalsService,
    CheckoutService,
    InventoryStockService,
    ShippingRatesService,
    ShippingZonesService,
    InventoryLocationsService,
    JwtService,
    InventoryLedgerService,
    InvoiceService,
    InvoiceTotalsService,
    StoresService,
    AwsService,
  ],
  exports: [CartService],
})
export class CartModule {}
