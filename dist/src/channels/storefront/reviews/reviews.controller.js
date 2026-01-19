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
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const storefront_review_query_dto_1 = require("./dto/storefront-review-query.dto");
const create_storefront_review_dto_1 = require("./dto/create-storefront-review.dto");
const reviews_service_1 = require("../../../domains/reviews/reviews.service");
const storefront_guard_1 = require("../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../common/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../common/decorators/current-store.decorator");
const user_agent_1 = require("../common/decorators/user-agent");
let ReviewsController = class ReviewsController extends base_controller_1.BaseController {
    constructor(reviewsService) {
        super();
        this.reviewsService = reviewsService;
    }
    async listStorefrontReviews(companyId, productId, query) {
        const reviews = await this.reviewsService.listStorefrontReviewsByProduct(companyId, productId, query);
        return reviews;
    }
    async createStorefrontReview(companyId, storeId, productId, dto, ip, userAgent) {
        return this.reviewsService.createStorefrontReview(companyId, storeId, productId, dto, ip, userAgent);
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Get)('storefront/:productId'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, storefront_review_query_dto_1.StorefrontReviewQueryDto]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "listStorefrontReviews", null);
__decorate([
    (0, common_1.Post)('storefront/:productId'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('productId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __param(5, (0, user_agent_1.UserAgent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, create_storefront_review_dto_1.CreateStorefrontReviewDto, String, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createStorefrontReview", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, common_1.Controller)('catalog/reviews'),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map