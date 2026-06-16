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
var CampaignWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignWebhookService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const campaigns_service_1 = require("./campaigns.service");
let CampaignWebhookService = CampaignWebhookService_1 = class CampaignWebhookService {
    constructor(db, campaignService) {
        this.db = db;
        this.campaignService = campaignService;
        this.logger = new common_1.Logger(CampaignWebhookService_1.name);
    }
    async handle(payload) {
        const { type, data } = payload;
        const resendMessageId = data.email_id;
        const recipientEmail = data.to?.[0];
        if (!resendMessageId || !recipientEmail) {
            this.logger.warn('Webhook received with missing email_id or recipient');
            return { received: true };
        }
        const [sentEvent] = await this.db
            .select()
            .from(schema_1.campaignEvents)
            .where((0, drizzle_orm_1.eq)(schema_1.campaignEvents.resendMessageId, resendMessageId))
            .limit(1)
            .execute();
        if (!sentEvent) {
            this.logger.debug(`No campaign event found for resendMessageId: ${resendMessageId}`);
            return { received: true };
        }
        const { campaignId, companyId } = sentEvent;
        switch (type) {
            case 'email.opened': {
                await this.db
                    .insert(schema_1.campaignEvents)
                    .values({
                    companyId,
                    campaignId,
                    recipientEmail,
                    resendMessageId,
                    eventType: 'opened',
                })
                    .execute();
                await this.campaignService.incrementStat(campaignId, 'openCount');
                break;
            }
            case 'email.clicked': {
                await this.db
                    .insert(schema_1.campaignEvents)
                    .values({
                    companyId,
                    campaignId,
                    recipientEmail,
                    resendMessageId,
                    eventType: 'clicked',
                    clickedUrl: data.click?.link ?? null,
                })
                    .execute();
                await this.campaignService.incrementStat(campaignId, 'clickCount');
                break;
            }
            case 'email.unsubscribed': {
                await this.db
                    .insert(schema_1.campaignEvents)
                    .values({
                    companyId,
                    campaignId,
                    recipientEmail,
                    resendMessageId,
                    eventType: 'unsubscribed',
                })
                    .execute();
                await this.campaignService.incrementStat(campaignId, 'unsubscribeCount');
                await this.db
                    .update(schema_1.subscribers)
                    .set({ status: 'unsubscribed', updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.subscribers.email, recipientEmail))
                    .execute();
                break;
            }
            case 'email.bounced': {
                await this.db
                    .insert(schema_1.campaignEvents)
                    .values({
                    companyId,
                    campaignId,
                    recipientEmail,
                    resendMessageId,
                    eventType: 'bounced',
                })
                    .execute();
                break;
            }
            case 'email.complained': {
                await this.db
                    .insert(schema_1.campaignEvents)
                    .values({
                    companyId,
                    campaignId,
                    recipientEmail,
                    resendMessageId,
                    eventType: 'complained',
                })
                    .execute();
                await this.db
                    .update(schema_1.subscribers)
                    .set({ status: 'unsubscribed', updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.subscribers.email, recipientEmail))
                    .execute();
                break;
            }
            default:
                this.logger.debug(`Webhook event ignored: ${type}`);
        }
        return { received: true };
    }
};
exports.CampaignWebhookService = CampaignWebhookService;
exports.CampaignWebhookService = CampaignWebhookService = CampaignWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, campaigns_service_1.CampaignService])
], CampaignWebhookService);
//# sourceMappingURL=campaign-webhook.service.js.map