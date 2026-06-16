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
exports.CreditService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../infrastructure/cache/cache.service");
let CreditService = class CreditService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async bumpCompany(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async getBalance(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['credits', 'balance', companyId], async () => {
            const [row] = await this.db
                .select()
                .from(schema_1.creditBalance)
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .execute();
            if (!row) {
                return { balance: 0, lifetimeCredits: 0 };
            }
            return row;
        });
    }
    async getTransactions(companyId, opts) {
        const limit = Math.min(Number(opts?.limit ?? 50), 200);
        const offset = Number(opts?.offset ?? 0);
        return this.cache.getOrSetVersioned(companyId, [
            'credits',
            'transactions',
            companyId,
            opts?.channel ?? 'all',
            String(limit),
            String(offset),
        ], async () => {
            const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.creditTransactions.companyId, companyId), opts?.channel
                ? (0, drizzle_orm_1.eq)(schema_1.creditTransactions.channel, opts.channel)
                : undefined);
            const rows = await this.db
                .select()
                .from(schema_1.creditTransactions)
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.creditTransactions.createdAt))
                .limit(limit)
                .offset(offset)
                .execute();
            const [{ count }] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.creditTransactions)
                .where(where)
                .execute();
            return { rows, count: Number(count ?? 0), limit, offset };
        });
    }
    async topUp(companyId, amount, channel, note) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Top-up amount must be greater than zero');
        }
        const result = await this.db.transaction(async (tx) => {
            const [existing] = await tx
                .select()
                .from(schema_1.creditBalance)
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .for('update')
                .execute();
            let newBalance;
            let newLifetime;
            if (!existing) {
                newBalance = amount;
                newLifetime = amount;
                await tx
                    .insert(schema_1.creditBalance)
                    .values({
                    companyId,
                    balance: amount,
                    lifetimeCredits: amount,
                })
                    .execute();
            }
            else {
                newBalance = existing.balance + amount;
                newLifetime = existing.lifetimeCredits + amount;
                await tx
                    .update(schema_1.creditBalance)
                    .set({
                    balance: newBalance,
                    lifetimeCredits: newLifetime,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                    .execute();
            }
            const [tx_row] = await tx
                .insert(schema_1.creditTransactions)
                .values({
                companyId,
                channel,
                type: 'topup',
                amount,
                balanceAfter: newBalance,
                note: note ?? null,
            })
                .returning()
                .execute();
            return {
                balance: newBalance,
                lifetimeCredits: newLifetime,
                transaction: tx_row,
            };
        });
        await this.bumpCompany(companyId);
        return result;
    }
    async debit(companyId, amount, channel, referenceType, referenceId) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Debit amount must be greater than zero');
        }
        const result = await this.db.transaction(async (tx) => {
            const [row] = await tx
                .select()
                .from(schema_1.creditBalance)
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .for('update')
                .execute();
            if (!row) {
                throw new common_1.BadRequestException('No credit balance found for this company');
            }
            if (row.balance < amount) {
                throw new common_1.BadRequestException(`Insufficient credits. Required: ${amount}, available: ${row.balance}`);
            }
            const newBalance = row.balance - amount;
            await tx
                .update(schema_1.creditBalance)
                .set({ balance: newBalance, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .execute();
            const [tx_row] = await tx
                .insert(schema_1.creditTransactions)
                .values({
                companyId,
                channel,
                type: 'send',
                amount: -amount,
                balanceAfter: newBalance,
                referenceType,
                referenceId,
            })
                .returning()
                .execute();
            return { balance: newBalance, transaction: tx_row };
        });
        await this.bumpCompany(companyId);
        return result;
    }
    async refund(companyId, amount, channel, referenceType, referenceId, note) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Refund amount must be greater than zero');
        }
        const result = await this.db.transaction(async (tx) => {
            const [row] = await tx
                .select()
                .from(schema_1.creditBalance)
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .for('update')
                .execute();
            if (!row) {
                throw new common_1.NotFoundException('No credit balance found for this company');
            }
            const newBalance = row.balance + amount;
            await tx
                .update(schema_1.creditBalance)
                .set({ balance: newBalance, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .execute();
            const [tx_row] = await tx
                .insert(schema_1.creditTransactions)
                .values({
                companyId,
                channel,
                type: 'refund',
                amount,
                balanceAfter: newBalance,
                referenceType,
                referenceId,
                note: note ?? 'Refund due to failed send',
            })
                .returning()
                .execute();
            return { balance: newBalance, transaction: tx_row };
        });
        await this.bumpCompany(companyId);
        return result;
    }
    async adjust(companyId, amount, channel, note) {
        const result = await this.db.transaction(async (tx) => {
            const [row] = await tx
                .select()
                .from(schema_1.creditBalance)
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .for('update')
                .execute();
            if (!row) {
                throw new common_1.NotFoundException('No credit balance found for this company');
            }
            const newBalance = row.balance + amount;
            if (newBalance < 0) {
                throw new common_1.BadRequestException(`Adjustment would result in negative balance (${newBalance})`);
            }
            await tx
                .update(schema_1.creditBalance)
                .set({ balance: newBalance, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.creditBalance.companyId, companyId))
                .execute();
            const [tx_row] = await tx
                .insert(schema_1.creditTransactions)
                .values({
                companyId,
                channel,
                type: 'adjustment',
                amount,
                balanceAfter: newBalance,
                note,
            })
                .returning()
                .execute();
            return { balance: newBalance, transaction: tx_row };
        });
        await this.bumpCompany(companyId);
        return result;
    }
};
exports.CreditService = CreditService;
exports.CreditService = CreditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], CreditService);
//# sourceMappingURL=credits.service.js.map