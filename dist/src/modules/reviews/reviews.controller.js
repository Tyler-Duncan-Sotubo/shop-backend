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
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../common/interceptor/base.controller");
const reviews_service_1 = require("./reviews.service");
const dto_1 = require("./dto");
const api_key_guard_1 = require("../iam/api-keys/guard/api-key.guard");
const api_scopes_decorator_1 = require("../iam/api-keys/decorators/api-scopes.decorator");
const current_company_id_decorator_1 = require("../iam/api-keys/decorators/current-company-id.decorator");
const storefront_review_query_dto_1 = require("./dto/storefront-review-query.dto");
const create_storefront_review_dto_1 = require("./dto/create-storefront-review.dto");
const user_agent_1 = require("../auth/decorator/user-agent");
let ReviewsController = class ReviewsController extends base_controller_1.BaseController {
    constructor(reviewsService) {
        super();
        this.reviewsService = reviewsService;
    }
    async listReviews(user, query) {
        return this.reviewsService.listReviews(user.companyId, query);
    }
    async listReviewsByProduct(user, productId, limit, offset) {
        return this.reviewsService.listReviewsByProduct(user.companyId, productId, {
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }
    async updateReview(user, reviewId, dto, ip) {
        return this.reviewsService.updateReview(user.companyId, reviewId, dto, user, ip);
    }
    async listStorefrontReviews(companyId, productId, query) {
        const reviews = await this.reviewsService.listStorefrontReviewsByProduct(companyId, productId, query);
        return reviews;
    }
    async createStorefrontReview(companyId, productId, dto, ip, userAgent) {
        return this.reviewsService.createStorefrontReview(companyId, productId, dto, ip, userAgent);
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "listReviews", null);
__decorate([
    (0, common_1.Get)('product/:productId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "listReviewsByProduct", null);
__decorate([
    (0, common_1.Patch)(':reviewId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['reviews.moderate']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateReviewDto, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "updateReview", null);
__decorate([
    (0, common_1.Get)('storefront/:productId'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, api_scopes_decorator_1.ApiScopes)('reviews.read'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, storefront_review_query_dto_1.StorefrontReviewQueryDto]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "listStorefrontReviews", null);
__decorate([
    (0, common_1.Post)('storefront/:productId'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, api_scopes_decorator_1.ApiScopes)('reviews.create'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __param(4, (0, user_agent_1.UserAgent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_storefront_review_dto_1.CreateStorefrontReviewDto, String, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createStorefrontReview", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, common_1.Controller)('catalog/reviews'),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map