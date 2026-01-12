"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutModule = void 0;
const common_1 = require("@nestjs/common");
const checkout_controller_1 = require("./checkout.controller");
const checkout_service_1 = require("./checkout.service");
const cart_service_1 = require("../cart/cart.service");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const shipping_rates_service_1 = require("../../fulfillment/shipping/services/shipping-rates.service");
const shipping_zones_service_1 = require("../../fulfillment/shipping/services/shipping-zones.service");
const inventory_locations_service_1 = require("../inventory/services/inventory-locations.service");
const storefront_checkout_controller_1 = require("./storefront-checkout.controller");
const api_keys_service_1 = require("../../iam/api-keys/api-keys.service");
const inventory_ledger_service_1 = require("../inventory/services/inventory-ledger.service");
const invoice_service_1 = require("../../billing/invoice/invoice.service");
const invoice_totals_service_1 = require("../../billing/invoice/invoice-totals.service");
const stores_service_1 = require("../stores/stores.service");
const aws_service_1 = require("../../../common/aws/aws.service");
const checkout_payment_service_1 = require("./checkout-payment.service");
let CheckoutModule = class CheckoutModule {
};
exports.CheckoutModule = CheckoutModule;
exports.CheckoutModule = CheckoutModule = __decorate([
    (0, common_1.Module)({
        controllers: [checkout_controller_1.CheckoutController, storefront_checkout_controller_1.StorefrontCheckoutController],
        providers: [
            checkout_service_1.CheckoutService,
            cart_service_1.CartService,
            inventory_stock_service_1.InventoryStockService,
            shipping_rates_service_1.ShippingRatesService,
            shipping_zones_service_1.ShippingZonesService,
            inventory_locations_service_1.InventoryLocationsService,
            api_keys_service_1.ApiKeysService,
            inventory_ledger_service_1.InventoryLedgerService,
            invoice_service_1.InvoiceService,
            invoice_totals_service_1.InvoiceTotalsService,
            stores_service_1.StoresService,
            aws_service_1.AwsService,
            checkout_payment_service_1.CheckoutPaymentsService,
        ],
        exports: [checkout_service_1.CheckoutService],
    })
], CheckoutModule);
//# sourceMappingURL=checkout.module.js.map