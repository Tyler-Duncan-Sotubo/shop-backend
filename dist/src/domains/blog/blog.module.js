"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogModule = void 0;
const common_1 = require("@nestjs/common");
const blog_service_1 = require("./blog.service");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
const stores_service_1 = require("../commerce/stores/stores.service");
const blog_posts_report_service_1 = require("./blog-posts-report.service");
let BlogModule = class BlogModule {
};
exports.BlogModule = BlogModule;
exports.BlogModule = BlogModule = __decorate([
    (0, common_1.Module)({
        providers: [blog_service_1.BlogService, aws_service_1.AwsService, stores_service_1.StoresService, blog_posts_report_service_1.BlogPostsReportService],
        exports: [blog_service_1.BlogService, blog_posts_report_service_1.BlogPostsReportService],
    })
], BlogModule);
//# sourceMappingURL=blog.module.js.map