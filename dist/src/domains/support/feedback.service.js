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
exports.SupportFeedbackService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const feedback_notification_service_1 = require("../notification/services/feedback-notification.service");
let SupportFeedbackService = class SupportFeedbackService {
    constructor(db, mailer) {
        this.db = db;
        this.mailer = mailer;
    }
    async create(dto, companyId) {
        const [created] = await this.db
            .insert(schema_1.supportFeedback)
            .values({
            companyId,
            category: dto.category,
            message: dto.message,
            platform: dto.platform ?? 'mobile',
        })
            .returning();
        const company = await this.db.query.companies.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companies.id, companyId),
            columns: { name: true },
        });
        await this.mailer.sendFeedbackNotification({
            companyId,
            companyName: company?.name ?? companyId,
            category: dto.category,
            message: dto.message,
            platform: dto.platform ?? 'mobile',
            submittedAt: created.createdAt.toISOString(),
        });
        return created;
    }
};
exports.SupportFeedbackService = SupportFeedbackService;
exports.SupportFeedbackService = SupportFeedbackService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, feedback_notification_service_1.FeedbackNotificationService])
], SupportFeedbackService);
//# sourceMappingURL=feedback.service.js.map