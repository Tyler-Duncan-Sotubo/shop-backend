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
exports.BlogController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const blog_service_1 = require("../../../domains/blog/blog.service");
const storefront_guard_1 = require("../common/guard/storefront.guard");
const current_store_decorator_1 = require("../common/decorators/current-store.decorator");
let BlogController = class BlogController extends base_controller_1.BaseController {
    constructor(blogService) {
        super();
        this.blogService = blogService;
    }
    listPublic(storeId, page, limit) {
        return this.blogService.listPublic(storeId, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    getBySlugPublic(storeId, slug) {
        return this.blogService.getBySlugPublic(storeId, slug);
    }
};
exports.BlogController = BlogController;
__decorate([
    (0, common_1.Get)('/public/list'),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "listPublic", null);
__decorate([
    (0, common_1.Get)('/public/:slug'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "getBySlugPublic", null);
exports.BlogController = BlogController = __decorate([
    (0, common_1.Controller)('blog-posts'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [blog_service_1.BlogService])
], BlogController);
//# sourceMappingURL=blog.controller.js.map