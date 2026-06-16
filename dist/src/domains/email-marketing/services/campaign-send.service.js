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
var CampaignSendService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignSendService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const campaigns_service_1 = require("./campaigns.service");
const campaign_audience_service_1 = require("./campaign-audience.service");
const email_sender_config_service_1 = require("./email-sender-config.service");
const credits_service_1 = require("../../credits/credits.service");
const resend_provider_1 = require("../../notification/resend.provider");
let CampaignSendService = CampaignSendService_1 = class CampaignSendService {
    constructor(db, resend, campaignService, audience, emailConfig, credits) {
        this.db = db;
        this.resend = resend;
        this.campaignService = campaignService;
        this.audience = audience;
        this.emailConfig = emailConfig;
        this.credits = credits;
        this.logger = new common_1.Logger(CampaignSendService_1.name);
    }
    async sendTest(companyId, campaignId, toEmail) {
        this.logger.log(`[sendTest] Starting — campaignId: ${campaignId}, to: ${toEmail}`);
        const campaign = await this.campaignService.getById(companyId, campaignId);
        this.logger.log(`[sendTest] Campaign found — status: ${campaign.status}, hasContent: ${!!campaign.contentJson}`);
        const config = await this.emailConfig.getConfigOrThrow(companyId);
        console.log(config);
        if (!campaign.contentJson) {
            throw new common_1.BadRequestException('Campaign has no content. Please add image blocks before sending.');
        }
        let parsedContent;
        try {
            parsedContent = JSON.parse(campaign.contentJson);
            this.logger.log(`[sendTest] Content parsed — blocks: ${parsedContent?.blocks?.length ?? 0}`);
        }
        catch (err) {
            this.logger.error(`[sendTest] Failed to parse contentJson`, err);
            throw new common_1.BadRequestException('Invalid campaign content JSON');
        }
        let html;
        try {
            html = renderEmailCampaign(parsedContent, config);
            this.logger.log(`[sendTest] HTML rendered — length: ${html.length}`);
        }
        catch (err) {
            this.logger.error(`[sendTest] Failed to render HTML`, err);
            throw new common_1.BadRequestException('Failed to render email template');
        }
        try {
            this.logger.log(`[sendTest] Sending via Resend — from: ${config.fromEmail} to: ${toEmail}`);
            const result = await this.resend.client.emails.send({
                from: `${config.fromName} <${config.fromEmail}>`,
                to: [toEmail],
                subject: `[TEST] ${campaign.subject}`,
                html,
            });
            this.logger.log(`[sendTest] Resend response — ${JSON.stringify(result)}`);
            return { success: true, sentTo: toEmail };
        }
        catch (err) {
            this.logger.error(`[sendTest] Resend send failed`, err);
            throw new common_1.BadRequestException(`Test send failed: ${err.message}`);
        }
    }
    async sendNow(companyId, campaignId) {
        const campaign = await this.campaignService.getById(companyId, campaignId);
        if (!['draft', 'scheduled'].includes(campaign.status)) {
            throw new common_1.BadRequestException(`Cannot send a campaign with status: ${campaign.status}`);
        }
        if (!campaign.contentJson) {
            throw new common_1.BadRequestException('Campaign has no content. Please add image blocks before sending.');
        }
        const config = await this.emailConfig.getConfigOrThrow(companyId);
        const { emails, count } = await this.audience.resolve(companyId, campaign.storeId, campaign.audienceType);
        if (count === 0) {
            throw new common_1.BadRequestException('No recipients found for this audience. Make sure subscribers or customers with marketing opt-in exist.');
        }
        await this.credits.debit(companyId, count, 'email', 'campaign', campaignId);
        await this.campaignService.markSending(companyId, campaignId);
        const html = renderEmailCampaign(JSON.parse(campaign.contentJson), config);
        try {
            const BATCH_SIZE = 100;
            const chunks = chunkArray(emails, BATCH_SIZE);
            const allMessageIds = [];
            for (const chunk of chunks) {
                const batch = chunk.map((email) => ({
                    from: `${config.fromName} <${config.fromEmail}>`,
                    to: [email],
                    subject: campaign.subject,
                    ...(campaign.previewText && {
                        headers: { 'X-Preview-Text': campaign.previewText },
                    }),
                    html,
                }));
                const result = await this.resend.client.batch.send(batch);
                const ids = Array.isArray(result?.data)
                    ? result.data
                        .map((r) => r.id)
                        .filter((id) => !!id)
                    : [];
                allMessageIds.push(...ids);
            }
            if (allMessageIds.length > 0) {
                const eventRows = emails.map((email, i) => ({
                    companyId,
                    campaignId,
                    recipientEmail: email,
                    resendMessageId: allMessageIds[i] ?? null,
                    eventType: 'sent',
                }));
                const EVENT_CHUNK = 500;
                for (const chunk of chunkArray(eventRows, EVENT_CHUNK)) {
                    await this.db.insert(schema_1.campaignEvents).values(chunk).execute();
                }
            }
            await this.campaignService.markSent(companyId, campaignId, count, allMessageIds[0] ?? undefined);
            this.logger.log(`Campaign ${campaignId} sent to ${count} recipients for company ${companyId}`);
            return { success: true, sentCount: count };
        }
        catch (err) {
            this.logger.error(`Campaign ${campaignId} send failed — refunding ${count} credits`, err);
            await this.credits.refund(companyId, count, 'email', 'campaign', campaignId, `Send failed: ${err.message}`);
            await this.campaignService.markFailed(companyId, campaignId);
            throw new common_1.BadRequestException(`Campaign send failed: ${err.message}`);
        }
    }
    async processDueScheduled() {
        const now = new Date();
        const due = await this.db
            .select()
            .from(schema_1.campaigns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.status, 'scheduled')))
            .execute();
        const dueNow = due.filter((c) => c.scheduledAt && c.scheduledAt <= now);
        this.logger.log(`Processing ${dueNow.length} scheduled campaigns`);
        for (const campaign of dueNow) {
            try {
                await this.sendNow(campaign.companyId, campaign.id);
            }
            catch (err) {
                this.logger.error(`Scheduled campaign ${campaign.id} failed`, err);
            }
        }
    }
};
exports.CampaignSendService = CampaignSendService;
exports.CampaignSendService = CampaignSendService = CampaignSendService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, resend_provider_1.ResendProvider,
        campaigns_service_1.CampaignService,
        campaign_audience_service_1.CampaignAudienceService,
        email_sender_config_service_1.EmailSenderConfigService,
        credits_service_1.CreditService])
], CampaignSendService);
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
function renderEmailCampaign(content, config) {
    const color = config.brandColor ?? '#111111';
    const year = new Date().getFullYear();
    let socialLinks = {};
    try {
        if (config.socialLinks)
            socialLinks = JSON.parse(config.socialLinks);
    }
    catch { }
    const header = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
<center>
<table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#ffffff;">

  <!-- Logo header -->
  <tr>
    <td align="center" style="padding:24px;background:${color};">
      ${config.logoUrl
        ? `<img src="${config.logoUrl}" alt="${config.fromName}" height="40" style="display:block;height:40px;width:auto;" />`
        : `<span style="color:#ffffff;font-size:20px;font-weight:bold;">${config.fromName}</span>`}
    </td>
  </tr>`;
    const blocks = content?.blocks ?? [];
    let bodyHtml = '';
    let i = 0;
    while (i < blocks.length) {
        const block = blocks[i];
        if (block.width === 'full') {
            bodyHtml += `
  <tr>
    <td style="padding:0;font-size:0;line-height:0;">
      ${block.linkUrl
                ? `<a href="${block.linkUrl}" style="display:block;">`
                : ''}
      <img src="${block.imageUrl}" alt="" width="600"
        style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
      ${block.linkUrl ? `</a>` : ''}
    </td>
  </tr>`;
            i++;
        }
        else {
            const next = blocks[i + 1]?.width === 'half' ? blocks[i + 1] : null;
            bodyHtml += `
  <tr>
    <td style="padding:0;font-size:0;line-height:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding:0;font-size:0;line-height:0;">
            ${block.linkUrl ? `<a href="${block.linkUrl}" style="display:block;">` : ''}
            <img src="${block.imageUrl}" alt="" width="300"
              style="display:block;width:100%;max-width:300px;height:auto;border:0;" />
            ${block.linkUrl ? `</a>` : ''}
          </td>
          <td width="50%" style="padding:0;font-size:0;line-height:0;">
            ${next ? (next.linkUrl ? `<a href="${next.linkUrl}" style="display:block;">` : '') : ''}
            ${next ? `<img src="${next.imageUrl}" alt="" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:0;" />` : ''}
            ${next && next.linkUrl ? `</a>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
            i += next ? 2 : 1;
        }
    }
    const socialIcons = Object.entries({
        twitter: socialLinks.twitter,
        facebook: socialLinks.facebook,
        instagram: socialLinks.instagram,
        youtube: socialLinks.youtube,
    })
        .filter(([, url]) => !!url)
        .map(([name, url]) => `
      <td style="padding:0 6px;">
        <a href="${url}" style="display:inline-block;width:32px;height:32px;
          background:#333333;border-radius:50%;text-align:center;line-height:32px;
          text-decoration:none;color:#888888;font-size:10px;">
          ${name.slice(0, 2)}
        </a>
      </td>`)
        .join('');
    const footer = `
  <!-- Footer -->
  <tr>
    <td style="background:#111111;padding:32px 24px;text-align:center;">
      ${socialIcons
        ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
              <tr>${socialIcons}</tr>
             </table>`
        : ''}
      ${config.footerTagline ? `<p style="margin:0 0 8px;font-size:12px;color:#aaaaaa;">${config.footerTagline}</p>` : ''}
      <p style="margin:0 0 6px;font-size:11px;color:#999999;">
        ${config.fromName}${config.companyAddress ? ` | ${config.companyAddress}` : ''}
      </p>
      <p style="margin:0 0 6px;font-size:11px;color:#777777;">
        &copy; ${year} | All rights reserved.
      </p>
      <p style="margin:0;font-size:11px;color:#777777;">
        No longer want to receive these emails?
        <a href="{{unsubscribeUrl}}" style="color:#aaaaaa;">Unsubscribe</a>
      </p>
    </td>
  </tr>

</table>
</center>
</body>
</html>`;
    return header + bodyHtml + footer;
}
//# sourceMappingURL=campaign-send.service.js.map