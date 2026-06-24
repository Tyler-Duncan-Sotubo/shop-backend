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
exports.CompanyBankAccountsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let CompanyBankAccountsService = class CompanyBankAccountsService {
    constructor(db) {
        this.db = db;
    }
    async list(companyId) {
        return this.db
            .select()
            .from(schema_1.companyBankAccounts)
            .where((0, drizzle_orm_1.eq)(schema_1.companyBankAccounts.companyId, companyId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.companyBankAccounts.sortOrder), (0, drizzle_orm_1.asc)(schema_1.companyBankAccounts.createdAt))
            .execute();
    }
    async findById(companyId, id) {
        const [row] = await this.db
            .select()
            .from(schema_1.companyBankAccounts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyBankAccounts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyBankAccounts.id, id)))
            .limit(1)
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Bank account not found');
        return row;
    }
    async create(companyId, input) {
        const [row] = await this.db
            .insert(schema_1.companyBankAccounts)
            .values({
            companyId,
            label: input.label.trim(),
            bankName: input.bankName.trim(),
            accountName: input.accountName.trim(),
            accountNumber: input.accountNumber.trim(),
            tin: input.tin?.trim() ?? null,
            sortOrder: input.sortOrder ?? 0,
        })
            .returning()
            .execute();
        return row;
    }
    async update(companyId, id, input) {
        await this.findById(companyId, id);
        const [row] = await this.db
            .update(schema_1.companyBankAccounts)
            .set({
            ...(input.label !== undefined && { label: input.label.trim() }),
            ...(input.bankName !== undefined && { bankName: input.bankName.trim() }),
            ...(input.accountName !== undefined && { accountName: input.accountName.trim() }),
            ...(input.accountNumber !== undefined && { accountNumber: input.accountNumber.trim() }),
            ...(input.tin !== undefined && { tin: input.tin?.trim() ?? null }),
            ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyBankAccounts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyBankAccounts.id, id)))
            .returning()
            .execute();
        return row;
    }
    async remove(companyId, id) {
        await this.findById(companyId, id);
        await this.db
            .delete(schema_1.companyBankAccounts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyBankAccounts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyBankAccounts.id, id)))
            .execute();
        return { success: true };
    }
};
exports.CompanyBankAccountsService = CompanyBankAccountsService;
exports.CompanyBankAccountsService = CompanyBankAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], CompanyBankAccountsService);
//# sourceMappingURL=company-bank-accounts.service.js.map