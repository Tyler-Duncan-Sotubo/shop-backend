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
exports.ProductsHelpersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const slugify_1 = require("../../utils/slugify");
let ProductsHelpersService = class ProductsHelpersService {
    constructor(db) {
        this.db = db;
    }
    async assertCompanyExists(companyId) {
        const company = await this.db.query.companies.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companies.id, companyId),
        });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        return company;
    }
    async findProductByIdOrThrow(companyId, productId) {
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
            with: { variants: true, images: true, productCategories: true },
        });
        if (!product)
            throw new common_1.NotFoundException(`Product not found for company ${companyId}`);
        return product;
    }
    async ensureSlugUnique(companyId, slug, excludeId) {
        const existing = await this.db
            .select({ id: schema_1.products.id })
            .from(schema_1.products)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.slug, slug)))
            .execute();
        const conflict = existing.find((p) => p.id !== excludeId);
        if (conflict)
            throw new common_1.ConflictException(`Slug "${slug}" already exists`);
    }
    toSlug(input) {
        return (0, slugify_1.slugify)(input);
    }
    sanitizeFileName(name) {
        const raw = (name ?? '').trim();
        if (!raw)
            return null;
        return raw
            .replace(/[/\\]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '');
    }
    assertS3KeyAllowed(companyId, key) {
        const prefix = `companies/${companyId}/products/`;
        if (!key.startsWith(prefix) || key.includes('..')) {
            throw new Error('Invalid image key');
        }
    }
};
exports.ProductsHelpersService = ProductsHelpersService;
exports.ProductsHelpersService = ProductsHelpersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], ProductsHelpersService);
//# sourceMappingURL=products-helpers.service.js.map