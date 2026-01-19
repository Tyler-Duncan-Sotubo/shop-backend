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
exports.LinkedProductsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const linked_products_service_1 = require("../../../../domains/catalog/services/linked-products.service");
const storefront_guard_1 = require("../../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../common/decorators/current-company-id.decorator");
let LinkedProductsController = class LinkedProductsController extends base_controller_1.BaseController {
    constructor(linkedProductsService) {
        super();
        this.linkedProductsService = linkedProductsService;
    }
    async GetStoreFrontLinkedProducts(companyId, productId, linkType) {
        return this.linkedProductsService.getLinkedProducts(companyId, productId, linkType);
    }
};
exports.LinkedProductsController = LinkedProductsController;
__decorate([
    (0, common_1.Get)('links/storefront/:productId'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Query)('linkType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LinkedProductsController.prototype, "GetStoreFrontLinkedProducts", null);
exports.LinkedProductsController = LinkedProductsController = __decorate([
    (0, common_1.Controller)('catalog'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [linked_products_service_1.LinkedProductsService])
], LinkedProductsController);
//# sourceMappingURL=linked-products.controller.js.map