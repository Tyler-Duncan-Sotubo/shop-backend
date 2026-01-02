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
const base_controller_1 = require("../../common/interceptor/base.controller");
const create_blog_post_dto_1 = require("./dto/create-blog-post.dto");
const update_blog_post_dto_1 = require("./dto/update-blog-post.dto");
const blog_service_1 = require("./blog.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const blog_posts_admin_query_dto_1 = require("./dto/blog-posts-admin-query.dto");
const api_key_guard_1 = require("../iam/api-keys/guard/api-key.guard");
const current_store_decorator_1 = require("../iam/api-keys/decorators/current-store.decorator");
const api_scopes_decorator_1 = require("../iam/api-keys/decorators/api-scopes.decorator");
let BlogController = class BlogController extends base_controller_1.BaseController {
    constructor(blogService) {
        super();
        this.blogService = blogService;
    }
    create(user, dto, ip) {
        return this.blogService.create(user, dto, ip);
    }
    listAdmin(user, filters) {
        return this.blogService.listAdmin(user, filters);
    }
    getByIdAdmin(user, params) {
        return this.blogService.getByIdAdmin(user, params.id);
    }
    update(user, params, dto, ip) {
        return this.blogService.update(user, params.id, dto, ip);
    }
    publish(user, params, ip) {
        return this.blogService.publish(user, params.id, ip);
    }
    unpublish(user, params, ip) {
        return this.blogService.unpublish(user, params.id, ip);
    }
    remove(user, params, ip) {
        return this.blogService.remove(user, params.id, ip);
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
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['blog.posts.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_blog_post_dto_1.CreateBlogPostDto, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['blog.posts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, blog_posts_admin_query_dto_1.BlogPostsAdminQueryDto]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "listAdmin", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['blog.posts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_blog_post_dto_1.BlogPostIdParamDto]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "getByIdAdmin", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['blog.posts.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_blog_post_dto_1.BlogPostIdParamDto,
        update_blog_post_dto_1.UpdateBlogPostDto, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['blog.posts.publish']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_blog_post_dto_1.BlogPostIdParamDto, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/unpublish'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['blog.posts.publish']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_blog_post_dto_1.BlogPostIdParamDto, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "unpublish", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['blog.posts.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_blog_post_dto_1.BlogPostIdParamDto, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('/public/list'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, api_scopes_decorator_1.ApiScopes)('quotes.create'),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "listPublic", null);
__decorate([
    (0, common_1.Get)('/public/:slug'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, api_scopes_decorator_1.ApiScopes)('quotes.create'),
    __param(0, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BlogController.prototype, "getBySlugPublic", null);
exports.BlogController = BlogController = __decorate([
    (0, common_1.Controller)('blog-posts'),
    __metadata("design:paramtypes", [blog_service_1.BlogService])
], BlogController);
//# sourceMappingURL=blog.controller.js.map