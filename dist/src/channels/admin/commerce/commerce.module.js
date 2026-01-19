"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCommerceModule = void 0;
const common_1 = require("@nestjs/common");
const inventory_module_1 = require("./inventory/inventory.module");
const orders_module_1 = require("./orders/orders.module");
const quote_module_1 = require("./quote/quote.module");
const stores_module_1 = require("./stores/stores.module");
let AdminCommerceModule = class AdminCommerceModule {
};
exports.AdminCommerceModule = AdminCommerceModule;
exports.AdminCommerceModule = AdminCommerceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            inventory_module_1.AdminInventoryModule,
            orders_module_1.AdminOrdersModule,
            quote_module_1.AdminQuoteModule,
            stores_module_1.AdminStoresModule,
        ],
    })
], AdminCommerceModule);
//# sourceMappingURL=commerce.module.js.map