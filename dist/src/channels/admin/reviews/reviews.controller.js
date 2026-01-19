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
const dto_1 = require("./dto");
const reviews_service_1 = require("../../../domains/reviews/reviews.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
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
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "listReviews", null);
__decorate([
    (0, common_1.Get)('product/:productId'),
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
    (0, common_1.SetMetadata)('permissions', ['reviews.moderate']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('reviewId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateReviewDto, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "updateReview", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, common_1.Controller)('catalog/reviews'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map