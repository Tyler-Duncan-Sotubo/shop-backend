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
exports.AnalyticsTagController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const analytics_tag_service_1 = require("../services/analytics-tag.service");
const create_analytics_tag_dto_1 = require("../dto/create-analytics-tag.dto");
let AnalyticsTagController = class AnalyticsTagController {
    constructor(tags) {
        this.tags = tags;
    }
    async list(user) {
        const data = await this.tags.listTags(user.companyId);
        return { data };
    }
    async create(user, dto) {
        const data = await this.tags.createTag(user.companyId, user.id, dto);
        return { data };
    }
    async revoke(user, tagId) {
        const data = await this.tags.revokeTag(user.companyId, tagId);
        return { data };
    }
};
exports.AnalyticsTagController = AnalyticsTagController;
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['analytics.write']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsTagController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['analytics.write']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_analytics_tag_dto_1.CreateAnalyticsTagDto]),
    __metadata("design:returntype", Promise)
], AnalyticsTagController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('admin/:tagId/revoke'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['analytics.write']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('tagId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsTagController.prototype, "revoke", null);
exports.AnalyticsTagController = AnalyticsTagController = __decorate([
    (0, common_1.Controller)('analytics/tags'),
    __metadata("design:paramtypes", [analytics_tag_service_1.AnalyticsTagService])
], AnalyticsTagController);
//# sourceMappingURL=analytics-tag.controller.js.map