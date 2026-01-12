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
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const quote_service_1 = require("./quote.service");
const create_quote_dto_1 = require("./dto/create-quote.dto");
const update_quote_dto_1 = require("./dto/update-quote.dto");
const get_quotes_query_dto_1 = require("./dto/get-quotes-query.dto");
const convert_quote_to_manual_order_dto_1 = require("./dto/convert-quote-to-manual-order.dto");
const current_store_decorator_1 = require("../../storefront-config/decorators/current-store.decorator");
const storefront_guard_1 = require("../../storefront-config/guard/storefront.guard");
let QuoteController = class QuoteController extends base_controller_1.BaseController {
    constructor(quoteService) {
        super();
        this.quoteService = quoteService;
    }
    getQuotes(user, query) {
        return this.quoteService.findAll(user.companyId, query);
    }
    getQuoteById(user, quoteId) {
        return this.quoteService.findOne(user.companyId, quoteId);
    }
    createQuote(user, dto, ip) {
        return this.quoteService.create(user.companyId, dto, user, ip);
    }
    updateQuote(user, quoteId, dto, ip) {
        return this.quoteService.update(user.companyId, quoteId, dto, user, ip);
    }
    convertQuoteToOrder(user, quoteId, dto, ip) {
        return this.quoteService.convertToManualOrder(user.companyId, quoteId, dto, user, ip);
    }
    deleteQuote(user, quoteId, ip) {
        return this.quoteService.remove(user.companyId, quoteId, user, ip);
    }
    async submitQuoteFromStorefront(storeId, dto, ip) {
        return this.quoteService.createFromStorefront(storeId, dto, ip);
    }
};
exports.QuoteController = QuoteController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['quotes.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_quotes_query_dto_1.GetQuotesQueryDto]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "getQuotes", null);
__decorate([
    (0, common_1.Get)(':quoteId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['quotes.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('quoteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "getQuoteById", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['quotes.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_quote_dto_1.CreateQuoteDto, String]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "createQuote", null);
__decorate([
    (0, common_1.Patch)(':quoteId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['quotes.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('quoteId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_quote_dto_1.UpdateQuoteDto, String]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "updateQuote", null);
__decorate([
    (0, common_1.Post)(':quoteId/convert-to-order'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['quotes.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('quoteId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, convert_quote_to_manual_order_dto_1.ConvertQuoteToManualOrderDto, String]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "convertQuoteToOrder", null);
__decorate([
    (0, common_1.Delete)(':quoteId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['quotes.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('quoteId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "deleteQuote", null);
__decorate([
    (0, common_1.Post)('storefront-quotes'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_quote_dto_1.CreateQuoteDto, String]),
    __metadata("design:returntype", Promise)
], QuoteController.prototype, "submitQuoteFromStorefront", null);
exports.QuoteController = QuoteController = __decorate([
    (0, common_1.Controller)('quotes'),
    __metadata("design:paramtypes", [quote_service_1.QuoteService])
], QuoteController);
//# sourceMappingURL=quote.controller.js.map