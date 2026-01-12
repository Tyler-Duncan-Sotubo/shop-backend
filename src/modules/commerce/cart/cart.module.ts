import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { StorefrontCartController } from './storefront-carts.controller';
import { ApiKeysService } from '../../iam/api-keys/api-keys.service';
import { CheckoutService } from '../checkout/checkout.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ShippingRatesService } from '../../fulfillment/shipping/services/shipping-rates.service';
import { ShippingZonesService } from '../../fulfillment/shipping/services/shipping-zones.service';
import { InventoryLocationsService } from '../inventory/services/inventory-locations.service';
import { CustomerPrimaryGuard } from '../../customers/guards/customer-primary.guard';
import { JwtService } from '@nestjs/jwt';
import { InventoryLedgerService } from '../inventory/services/inventory-ledger.service';
import { InvoiceService } from 'src/modules/billing/invoice/invoice.service';
import { InvoiceTotalsService } from 'src/modules/billing/invoice/invoice-totals.service';
import { StoresService } from '../stores/stores.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [CartController, StorefrontCartController],
  providers: [
    CartService,
    ApiKeysService,
    CheckoutService,
    InventoryStockService,
    ShippingRatesService,
    ShippingZonesService,
    InventoryLocationsService,
    CustomerPrimaryGuard,
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
