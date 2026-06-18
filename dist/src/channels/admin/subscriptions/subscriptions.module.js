"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSubscriptionsModule = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_controller_1 = require("./subscriptions.controller");
const subscriptions_module_1 = require("../../../domains/subscriptions/subscriptions.module");
let AdminSubscriptionsModule = class AdminSubscriptionsModule {
};
exports.AdminSubscriptionsModule = AdminSubscriptionsModule;
exports.AdminSubscriptionsModule = AdminSubscriptionsModule = __decorate([
    (0, common_1.Module)({
        imports: [subscriptions_module_1.SubscriptionsModule],
        controllers: [subscriptions_controller_1.SubscriptionsController, subscriptions_controller_1.BillingWebhookController],
    })
], AdminSubscriptionsModule);
//# sourceMappingURL=subscriptions.module.js.map