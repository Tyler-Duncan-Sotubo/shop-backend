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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogPostsAdminQueryDto = exports.BlogPostStatus = void 0;
const class_validator_1 = require("class-validator");
var BlogPostStatus;
(function (BlogPostStatus) {
    BlogPostStatus["DRAFT"] = "draft";
    BlogPostStatus["PUBLISHED"] = "published";
})(BlogPostStatus || (exports.BlogPostStatus = BlogPostStatus = {}));
class BlogPostsAdminQueryDto {
}
exports.BlogPostsAdminQueryDto = BlogPostsAdminQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(BlogPostStatus),
    __metadata("design:type", String)
], BlogPostsAdminQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BlogPostsAdminQueryDto.prototype, "storeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BlogPostsAdminQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], BlogPostsAdminQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], BlogPostsAdminQueryDto.prototype, "offset", void 0);
//# sourceMappingURL=blog-posts-admin-query.dto.js.map