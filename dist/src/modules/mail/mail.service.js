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
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../drizzle/schema");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const contact_notification_service_1 = require("../notification/services/contact-notification.service");
let MailService = class MailService {
    constructor(db, emailQueue, contactNotificationService) {
        this.db = db;
        this.emailQueue = emailQueue;
        this.contactNotificationService = contactNotificationService;
    }
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    async listSubscribers(companyId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.subscribers.companyId, companyId), query.storeId ? (0, drizzle_orm_1.eq)(schema_1.subscribers.storeId, query.storeId) : undefined, query.status ? (0, drizzle_orm_1.eq)(schema_1.subscribers.status, query.status) : undefined, query.search ? (0, drizzle_orm_1.ilike)(schema_1.subscribers.email, `%${query.search}%`) : undefined);
        const rows = await this.db
            .select({
            id: schema_1.subscribers.id,
            email: schema_1.subscribers.email,
            status: schema_1.subscribers.status,
            source: schema_1.subscribers.source,
            storeId: schema_1.subscribers.storeId,
            createdAt: schema_1.subscribers.createdAt,
            updatedAt: schema_1.subscribers.updatedAt,
        })
            .from(schema_1.subscribers)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.subscribers.createdAt))
            .limit(limit)
            .offset(offset);
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.subscribers)
            .where(where);
        return {
            data: rows,
            meta: {
                page,
                limit,
                total: Number(count),
                totalPages: Math.ceil(Number(count) / limit),
            },
        };
    }
    async getSubscriber(companyId, id) {
        const row = await this.db.query.subscribers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.subscribers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.subscribers.id, id)),
        });
        if (!row)
            throw new common_1.NotFoundException('Subscriber not found');
        return row;
    }
    async updateSubscriberStatus(companyId, id, status) {
        const [updated] = await this.db
            .update(schema_1.subscribers)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.subscribers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.subscribers.id, id)))
            .returning();
        if (!updated)
            throw new common_1.NotFoundException('Subscriber not found');
        return updated;
    }
    async listContactMessages(companyId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;
        const searchClause = query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.contactMessages.email, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.contactMessages.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.contactMessages.phone, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.contactMessages.company, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.contactMessages.message, `%${query.search}%`))
            : undefined;
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.contactMessages.companyId, companyId), query.storeId ? (0, drizzle_orm_1.eq)(schema_1.contactMessages.storeId, query.storeId) : undefined, query.status ? (0, drizzle_orm_1.eq)(schema_1.contactMessages.status, query.status) : undefined, searchClause);
        const rows = await this.db
            .select({
            id: schema_1.contactMessages.id,
            storeId: schema_1.contactMessages.storeId,
            subject: schema_1.contactMessages.subject,
            name: schema_1.contactMessages.name,
            email: schema_1.contactMessages.email,
            phone: schema_1.contactMessages.phone,
            company: schema_1.contactMessages.company,
            message: schema_1.contactMessages.message,
            status: schema_1.contactMessages.status,
            createdAt: schema_1.contactMessages.createdAt,
            updatedAt: schema_1.contactMessages.updatedAt,
        })
            .from(schema_1.contactMessages)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.contactMessages.createdAt))
            .limit(limit)
            .offset(offset);
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.contactMessages)
            .where(where);
        return {
            rows,
            count: Number(count),
            page,
            limit,
            offset,
        };
    }
    async getContactMessage(companyId, id) {
        const row = await this.db.query.contactMessages.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.contactMessages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.contactMessages.id, id)),
        });
        if (!row)
            throw new common_1.NotFoundException('Message not found');
        return row;
    }
    async updateContactMessageStatus(companyId, id, status) {
        const [updated] = await this.db
            .update(schema_1.contactMessages)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.contactMessages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.contactMessages.id, id)))
            .returning();
        if (!updated)
            throw new common_1.NotFoundException('Message not found');
        return updated;
    }
    async createSubscriber(companyId, dto, metadata) {
        const email = this.normalizeEmail(dto.email);
        const [created] = await this.db
            .insert(schema_1.subscribers)
            .values({
            companyId,
            storeId: dto.storeId ?? null,
            email,
            status: 'subscribed',
            source: dto.source ?? 'form',
            metadata: metadata ?? null,
        })
            .onConflictDoUpdate({
            target: [schema_1.subscribers.companyId, schema_1.subscribers.email],
            set: { updatedAt: new Date(), status: 'subscribed' },
        })
            .returning();
        return created;
    }
    async createContactMessage(companyId, dto, metadata) {
        const normalizedEmail = this.normalizeEmail(dto.email);
        const [created] = await this.db
            .insert(schema_1.contactMessages)
            .values({
            companyId,
            subject: dto.subject ?? null,
            storeId: dto.storeId ?? null,
            name: dto.name ?? null,
            email: normalizedEmail,
            phone: dto.phone ?? null,
            company: dto.company ?? null,
            message: dto.message,
            status: 'new',
            metadata: metadata ?? null,
        })
            .returning();
        const [company] = await this.db
            .select({ name: schema_1.companies.name })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .limit(1);
        const companyUsers = await this.db
            .select({ email: schema_1.users.email })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId));
        const to = companyUsers
            .map((u) => u.email)
            .filter((e) => Boolean(e?.trim()));
        await this.emailQueue.add('sendContactNotification', {
            to: to.length ? to : ['support@store.com'],
            storeName: company?.name ?? 'My Store',
            customerName: dto.name ?? null,
            customerEmail: normalizedEmail,
            subject: dto.subject ?? '(no subject)',
            message: dto.message,
            phone: dto.phone ?? null,
            company: dto.company ?? null,
        }, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        });
        return created;
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('emailQueue')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue,
        contact_notification_service_1.ContactNotificationService])
], MailService);
//# sourceMappingURL=mail.service.js.map