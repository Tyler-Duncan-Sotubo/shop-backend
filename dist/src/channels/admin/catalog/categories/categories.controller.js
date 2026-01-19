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
exports.CategoriesController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const categories_service_1 = require("../../../../domains/catalog/services/categories.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const dto_1 = require("./dto");
let CategoriesController = class CategoriesController extends base_controller_1.BaseController {
    constructor(categoriesService) {
        super();
        this.categoriesService = categoriesService;
    }
    async getCategories(user, storeId) {
        return this.categoriesService.getCategories(user.companyId, storeId ?? null);
    }
    async createCategory(user, dto, ip) {
        return this.categoriesService.createCategory(user.companyId, dto, user, ip);
    }
    async updateCategory(user, categoryId, dto, ip) {
        return this.categoriesService.updateCategory(user.companyId, categoryId, dto, user, ip);
    }
    async deleteCategory(user, categoryId, ip) {
        return this.categoriesService.deleteCategory(user.companyId, categoryId, user, ip);
    }
    async getProductCategories(user, productId) {
        return this.categoriesService.getProductCategories(user.companyId, productId);
    }
    async assignCategoriesToProduct(user, productId, dto, ip) {
        return this.categoriesService.assignCategoriesToProduct(user.companyId, productId, dto, user, ip);
    }
    async listCategoriesAdmin(user, storeId) {
        if (!storeId) {
            return [];
        }
        return this.categoriesService.listCategoriesAdmin(user.companyId, storeId);
    }
    async getCategoryAdmin(user, categoryId, storeId) {
        if (!storeId) {
            return [];
        }
        return this.categoriesService.getCategoryAdmin(user.companyId, storeId, categoryId);
    }
    async listCategoryProductsAdmin(user, categoryId, storeId, limit, offset, search) {
        if (!storeId) {
            throw new common_1.BadRequestException('storeId is required');
        }
        return this.categoriesService.getCategoryAdminWithProducts(user.companyId, storeId, categoryId, {
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
            search: search ?? undefined,
        });
    }
    async reorderCategoryProducts(user, categoryId, body) {
        return this.categoriesService.reorderCategoryProducts(user.companyId, categoryId, body.items ?? []);
    }
};
exports.CategoriesController = CategoriesController;
__decorate([
    (0, common_1.Get)('categories'),
    (0, common_1.SetMetadata)('permissions', ['categories.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, common_1.SetMetadata)('permissions', ['categories.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateCategoryDto, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:categoryId'),
    (0, common_1.SetMetadata)('permissions', ['categories.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateCategoryDto, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:categoryId'),
    (0, common_1.SetMetadata)('permissions', ['categories.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Get)('products/:productId/categories'),
    (0, common_1.SetMetadata)('permissions', ['categories.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "getProductCategories", null);
__decorate([
    (0, common_1.Put)('products/:productId/categories'),
    (0, common_1.SetMetadata)('permissions', ['categories.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.AssignCategoriesDto, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "assignCategoriesToProduct", null);
__decorate([
    (0, common_1.Get)('categories/admin'),
    (0, common_1.SetMetadata)('permissions', ['categories.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "listCategoriesAdmin", null);
__decorate([
    (0, common_1.Get)('categories/:categoryId/admin'),
    (0, common_1.SetMetadata)('permissions', ['categories.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "getCategoryAdmin", null);
__decorate([
    (0, common_1.Get)('categories/:categoryId/products/admin'),
    (0, common_1.SetMetadata)('permissions', ['categories.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Query)('storeId')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __param(5, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "listCategoryProductsAdmin", null);
__decorate([
    (0, common_1.Patch)('categories/:categoryId/products/reorder'),
    (0, common_1.SetMetadata)('permissions', ['categories.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "reorderCategoryProducts", null);
exports.CategoriesController = CategoriesController = __decorate([
    (0, common_1.Controller)('catalog'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService])
], CategoriesController);
//# sourceMappingURL=categories.controller.js.map