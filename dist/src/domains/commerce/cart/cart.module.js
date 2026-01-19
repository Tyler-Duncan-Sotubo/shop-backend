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
const checkout_service_1 = require("../checkout/checkout.service");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const shipping_rates_service_1 = require("../../fulfillment/shipping/services/shipping-rates.service");
const shipping_zones_service_1 = require("../../fulfillment/shipping/services/shipping-zones.service");
const inventory_locations_service_1 = require("../inventory/services/inventory-locations.service");
const jwt_1 = require("@nestjs/jwt");
const inventory_ledger_service_1 = require("../inventory/services/inventory-ledger.service");
const invoice_service_1 = require("../../billing/invoice/invoice.service");
const invoice_totals_service_1 = require("../../billing/invoice/invoice-totals.service");
const stores_service_1 = require("../stores/stores.service");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
const cart_service_1 = require("./cart.service");
const cart_query_service_1 = require("./services/cart-query.service");
const cart_lifecycle_service_1 = require("./services/cart-lifecycle.service");
const cart_token_service_1 = require("./services/cart-token.service");
const cart_item_mutation_service_1 = require("./services/cart-item-mutation.service");
const cart_totals_service_1 = require("./services/cart-totals.service");
const inventory_module_1 = require("../inventory/inventory.module");
let CartModule = class CartModule {
};
exports.CartModule = CartModule;
exports.CartModule = CartModule = __decorate([
    (0, common_1.Module)({
        imports: [inventory_module_1.InventoryModule],
        providers: [
            cart_service_1.CartService,
            cart_query_service_1.CartQueryService,
            cart_lifecycle_service_1.CartLifecycleService,
            cart_token_service_1.CartTokenService,
            cart_item_mutation_service_1.CartItemMutationService,
            cart_totals_service_1.CartTotalsService,
            checkout_service_1.CheckoutService,
            inventory_stock_service_1.InventoryStockService,
            shipping_rates_service_1.ShippingRatesService,
            shipping_zones_service_1.ShippingZonesService,
            inventory_locations_service_1.InventoryLocationsService,
            jwt_1.JwtService,
            inventory_ledger_service_1.InventoryLedgerService,
            invoice_service_1.InvoiceService,
            invoice_totals_service_1.InvoiceTotalsService,
            stores_service_1.StoresService,
            aws_service_1.AwsService,
        ],
        exports: [cart_service_1.CartService],
    })
], CartModule);
//# sourceMappingURL=cart.module.js.map