"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const storefront_guard_1 = require("../../common/guard/storefront.guard");
const current_store_decorator_1 = require("../../common/decorators/current-store.decorator");
const create_quote_dto_1 = require("./dto/create-quote.dto");
const quote_service_1 = require("../../../../domains/commerce/quote/quote.service");
let QuoteController = class QuoteController extends base_controller_1.BaseController {
    constructor(quoteService) {
        super();
        this.quoteService = quoteService;
    }
    async submitQuoteFromStorefront(storeId, dto, ip) {
        return this.quoteService.createFromStorefront(storeId, dto, ip);
    }
};
exports.QuoteController = QuoteController;
__decorate([
    (0, common_1.Post)(''),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_quote_dto_1.CreateQuoteDto, String]),
    __metadata("design:returntype", Promise)
], QuoteController.prototype, "submitQuoteFromStorefront", null);
exports.QuoteController = QuoteController = __decorate([
    (0, common_1.Controller)('quotes/storefront-quotes'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [quote_service_1.QuoteService])
], QuoteController);
//# sourceMappingURL=storefront-quote.controller.js.map