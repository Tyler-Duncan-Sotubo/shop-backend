"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const orders_controller_1 = require("./orders.controller");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const inventory_locations_service_1 = require("../inventory/services/inventory-locations.service");
const inventory_ledger_service_1 = require("../inventory/services/inventory-ledger.service");
const manual_orders_service_1 = require("./manual-orders.service");
const invoice_service_1 = require("../../billing/invoice/invoice.service");
const invoice_totals_service_1 = require("../../billing/invoice/invoice-totals.service");
const storefront_orders_controller_1 = require("./storefront-orders.controller");
const api_keys_service_1 = require("../../iam/api-keys/api-keys.service");
const stores_service_1 = require("../stores/stores.service");
const aws_service_1 = require("../../../common/aws/aws.service");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        controllers: [orders_controller_1.OrdersController, storefront_orders_controller_1.StorefrontOrdersController],
        providers: [
            orders_service_1.OrdersService,
            inventory_stock_service_1.InventoryStockService,
            inventory_locations_service_1.InventoryLocationsService,
            inventory_ledger_service_1.InventoryLedgerService,
            manual_orders_service_1.ManualOrdersService,
            invoice_service_1.InvoiceService,
            invoice_totals_service_1.InvoiceTotalsService,
            api_keys_service_1.ApiKeysService,
            stores_service_1.StoresService,
            aws_service_1.AwsService,
        ],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map