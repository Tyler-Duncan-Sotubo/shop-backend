"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoModule = void 0;
const common_1 = require("@nestjs/common");
const zoho_service_1 = require("./zoho.service");
const zoho_oauth_service_1 = require("./zoho-oauth.service");
const zoho_books_service_1 = require("./zoho-books.service");
const zoho_invoices_service_1 = require("./zoho-invoices.service");
const zoho_common_helper_1 = require("./helpers/zoho-common.helper");
const zoho_polling_cron_1 = require("./zoho-polling.cron");
let ZohoModule = class ZohoModule {
};
exports.ZohoModule = ZohoModule;
exports.ZohoModule = ZohoModule = __decorate([
    (0, common_1.Module)({
        providers: [
            zoho_service_1.ZohoService,
            zoho_oauth_service_1.ZohoOAuthService,
            zoho_books_service_1.ZohoBooksService,
            zoho_invoices_service_1.ZohoInvoicesService,
            zoho_common_helper_1.ZohoCommonHelper,
            zoho_polling_cron_1.ZohoPollingCron,
        ],
        exports: [
            zoho_service_1.ZohoService,
            zoho_oauth_service_1.ZohoOAuthService,
            zoho_books_service_1.ZohoBooksService,
            zoho_invoices_service_1.ZohoInvoicesService,
            zoho_common_helper_1.ZohoCommonHelper,
        ],
    })
], ZohoModule);
//# sourceMappingURL=zoho.module.js.map