"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartModule = void 0;
const common_1 = require("@nestjs/common");
const cart_service_1 = require("./cart.service");
const cart_controller_1 = require("./cart.controller");
const storefront_carts_controller_1 = require("./storefront-carts.controller");
const api_keys_service_1 = require("../../iam/api-keys/api-keys.service");
const checkout_service_1 = require("../checkout/checkout.service");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const shipping_rates_service_1 = require("../../fulfillment/shipping/services/shipping-rates.service");
const shipping_zones_service_1 = require("../../fulfillment/shipping/services/shipping-zones.service");
const inventory_locations_service_1 = require("../inventory/services/inventory-locations.service");
const customer_primary_guard_1 = require("../../customers/guards/customer-primary.guard");
const jwt_1 = require("@nestjs/jwt");
const inventory_ledger_service_1 = require("../inventory/services/inventory-ledger.service");
const invoice_service_1 = require("../../billing/invoice/invoice.service");
const invoice_totals_service_1 = require("../../billing/invoice/invoice-totals.service");
let CartModule = class CartModule {
};
exports.CartModule = CartModule;
exports.CartModule = CartModule = __decorate([
    (0, common_1.Module)({
        controllers: [cart_controller_1.CartController, storefront_carts_controller_1.StorefrontCartController],
        providers: [
            cart_service_1.CartService,
            api_keys_service_1.ApiKeysService,
            checkout_service_1.CheckoutService,
            inventory_stock_service_1.InventoryStockService,
            shipping_rates_service_1.ShippingRatesService,
            shipping_zones_service_1.ShippingZonesService,
            inventory_locations_service_1.InventoryLocationsService,
            customer_primary_guard_1.CustomerPrimaryGuard,
            jwt_1.JwtService,
            inventory_ledger_service_1.InventoryLedgerService,
            invoice_service_1.InvoiceService,
            invoice_totals_service_1.InvoiceTotalsService,
        ],
        exports: [cart_service_1.CartService],
    })
], CartModule);
//# sourceMappingURL=cart.module.js.map