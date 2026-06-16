// src/domains/email-marketing/services/campaign-send.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { campaigns, campaignEvents } from 'src/infrastructure/drizzle/schema';
import { CampaignService } from './campaigns.service';
import { CampaignAudienceService } from './campaign-audience.service';
import { EmailSenderConfigService } from './email-sender-config.service';
import { CreditService } from 'src/domains/credits/credits.service';
import { ResendProvider } from 'src/domains/notification/resend.provider';
import { renderCampaignTemplate } from '../templates/render-template';

@Injectable()
export class CampaignSendService {
  private readonly logger = new Logger(CampaignSendService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly resend: ResendProvider,
    private readonly campaignService: CampaignService,
    private readonly audience: CampaignAudienceService,
    private readonly emailConfig: EmailSenderConfigService,
    private readonly credits: CreditService,
  ) {}

  // -----------------------
  // SEND TEST
  // No credit debit — single email to actor
  // -----------------------
  async sendTest(companyId: string, campaignId: string, toEmail: string) {
    this.logger.log(
      `[sendTest] Starting — campaignId: ${campaignId}, to: ${toEmail}`,
    );

    const campaign = await this.campaignService.getById(companyId, campaignId);
    this.logger.log(
      `[sendTest] Campaign found — status: ${campaign.status}, hasContent: ${!!campaign.contentJson}`,
    );

    const config = await this.emailConfig.getConfigOrThrow(companyId);
    console.log(config);

    if (!campaign.contentJson) {
      throw new BadRequestException(
        'Campaign has no content. Please add image blocks before sending.',
      );
    }

    let parsedContent: any;
    try {
      parsedContent = JSON.parse(campaign.contentJson);
      this.logger.log(
        `[sendTest] Content parsed — blocks: ${parsedContent?.blocks?.length ?? 0}`,
      );
    } catch (err) {
      this.logger.error(`[sendTest] Failed to parse contentJson`, err);
      throw new BadRequestException('Invalid campaign content JSON');
    }

    let html: string;
    try {
      html = renderEmailCampaign(parsedContent, config);
      this.logger.log(`[sendTest] HTML rendered — length: ${html.length}`);
    } catch (err) {
      this.logger.error(`[sendTest] Failed to render HTML`, err);
      throw new BadRequestException('Failed to render email template');
    }

    try {
      this.logger.log(
        `[sendTest] Sending via Resend — from: ${config.fromEmail} to: ${toEmail}`,
      );

      const result = await this.resend.client.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [toEmail],
        subject: `[TEST] ${campaign.subject}`,
        html,
      });

      this.logger.log(`[sendTest] Resend response — ${JSON.stringify(result)}`);

      return { success: true, sentTo: toEmail };
    } catch (err) {
      this.logger.error(`[sendTest] Resend send failed`, err);
      throw new BadRequestException(
        `Test send failed: ${(err as Error).message}`,
      );
    }
  }

  // -----------------------
  // SEND NOW
  // -----------------------
  async sendNow(companyId: string, campaignId: string) {
    const campaign = await this.campaignService.getById(companyId, campaignId);

    // ── Guards ──────────────────────────────────────────────
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new BadRequestException(
        `Cannot send a campaign with status: ${campaign.status}`,
      );
    }

    if (!campaign.contentJson) {
      throw new BadRequestException(
        'Campaign has no content. Please add image blocks before sending.',
      );
    }

    const config = await this.emailConfig.getConfigOrThrow(companyId);

    // ── Resolve audience ────────────────────────────────────
    const { emails, count } = await this.audience.resolve(
      companyId,
      campaign.storeId,
      campaign.audienceType,
    );

    if (count === 0) {
      throw new BadRequestException(
        'No recipients found for this audience. Make sure subscribers or customers with marketing opt-in exist.',
      );
    }

    // ── Credit check + debit (atomic) ───────────────────────
    await this.credits.debit(companyId, count, 'email', 'campaign', campaignId);

    // ── Mark sending ────────────────────────────────────────
    await this.campaignService.markSending(companyId, campaignId);

    // ── Render ──────────────────────────────────────────────
    const html = renderEmailCampaign(JSON.parse(campaign.contentJson), config);

    // ── Batch send via Resend ───────────────────────────────
    try {
      const BATCH_SIZE = 100;
      const chunks = chunkArray(emails, BATCH_SIZE);
      const allMessageIds: string[] = [];

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

        const result = await (this.resend.client.batch as any).send(batch);

        // Resend v6 returns { data: { data: [...] } }
        const ids = Array.isArray(result?.data?.data)
          ? result.data.data
              .map((r: { id?: string }) => r.id)
              .filter((id): id is string => !!id)
          : [];

        allMessageIds.push(...ids);
      }

      // ── Write sent events ──────────────────────────────────
      // Always insert even if IDs are missing
      if (emails.length > 0) {
        const eventRows = emails.map((email, i) => ({
          companyId,
          campaignId,
          recipientEmail: email,
          resendMessageId: allMessageIds[i] ?? null,
          eventType: 'sent' as const,
        }));

        const EVENT_CHUNK = 500;
        for (const chunk of chunkArray(eventRows, EVENT_CHUNK)) {
          await this.db.insert(campaignEvents).values(chunk).execute();
        }
      }

      // ── Mark sent ──────────────────────────────────────────
      await this.campaignService.markSent(
        companyId,
        campaignId,
        count,
        allMessageIds[0] ?? undefined,
      );

      this.logger.log(
        `Campaign ${campaignId} sent to ${count} recipients for company ${companyId}`,
      );

      return { success: true, sentCount: count };
    } catch (err) {
      this.logger.error(
        `Campaign ${campaignId} send failed — refunding ${count} credits`,
        err,
      );

      await this.credits.refund(
        companyId,
        count,
        'email',
        'campaign',
        campaignId,
        `Send failed: ${(err as Error).message}`,
      );

      await this.campaignService.markFailed(companyId, campaignId);

      throw new BadRequestException(
        `Campaign send failed: ${(err as Error).message}`,
      );
    }
  }

  // -----------------------
  // SCHEDULE SEND
  // Called by cron job — picks up scheduled campaigns due to send
  // -----------------------
  async processDueScheduled() {
    const now = new Date();

    const due = await this.db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, 'scheduled'),
          // scheduledAt <= now
          // drizzle doesn't have lte for timestamps natively — use sql
        ),
      )
      .execute();

    // Filter in JS for safety
    const dueNow = due.filter((c) => c.scheduledAt && c.scheduledAt <= now);

    this.logger.log(`Processing ${dueNow.length} scheduled campaigns`);

    for (const campaign of dueNow) {
      try {
        await this.sendNow(campaign.companyId, campaign.id);
      } catch (err) {
        this.logger.error(`Scheduled campaign ${campaign.id} failed`, err);
      }
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Types ────────────────────────────────────────────────────
type Block = {
  imageUrl: string;
  linkUrl?: string | null;
  width: 'full' | 'half';
};

type ContentJson = {
  blocks: Block[];
};

// ── Renderer ─────────────────────────────────────────────────

function renderEmailCampaign(
  content: ContentJson,
  config: {
    fromName: string;
    logoUrl?: string | null;
    brandColor?: string | null;
    companyAddress?: string | null;
    footerTagline?: string | null;
    socialLinks?: string | null;
  },
): string {
  const color = config.brandColor ?? '#111111';
  const year = new Date().getFullYear();

  let socialLinks: Record<string, string> = {};
  try {
    if (config.socialLinks) socialLinks = JSON.parse(config.socialLinks);
  } catch {}

  const SOCIAL_ICONS: Record<string, string> = {
    twitter:
      'https://centa-hr.s3.eu-west-3.amazonaws.com/companies/019bbc22-ee74-7bfa-a6af-0a801a3d2e24/stores/019bbc3e-20be-7f38-85ed-c6867a6c0cfc/media/files/tmp/019ed187-04c4-7766-8527-64f736b21d4a-twitter.png',
    facebook:
      'https://centa-hr.s3.eu-west-3.amazonaws.com/companies/019bbc22-ee74-7bfa-a6af-0a801a3d2e24/stores/019bbc3e-20be-7f38-85ed-c6867a6c0cfc/media/files/tmp/019ed186-2d61-7c32-bf6f-83c759dd1798-facebook.png',
    instagram:
      'https://centa-hr.s3.eu-west-3.amazonaws.com/companies/019bbc22-ee74-7bfa-a6af-0a801a3d2e24/stores/019bbc3e-20be-7f38-85ed-c6867a6c0cfc/media/files/tmp/019ed186-bd42-7061-a6c0-b13dcf232a45-instagram.png',
    youtube:
      'https://centa-hr.s3.eu-west-3.amazonaws.com/companies/019bbc22-ee74-7bfa-a6af-0a801a3d2e24/stores/019bbc3e-20be-7f38-85ed-c6867a6c0cfc/media/files/tmp/019ed186-768d-7ede-84f3-192c80b21ed7-youtube.png',
  };

  // ── Header ───────────────────────────────────────────────
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
      ${
        config.logoUrl
          ? `<img src="${config.logoUrl}" alt="${config.fromName}" height="40" style="display:block;height:40px;width:auto;" />`
          : `<span style="color:#ffffff;font-size:20px;font-weight:bold;">${config.fromName}</span>`
      }
    </td>
  </tr>`;

  // ── Blocks ───────────────────────────────────────────────
  const blocks = content?.blocks ?? [];
  let bodyHtml = '';
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.width === 'full') {
      bodyHtml += `
  <tr>
    <td style="padding:0;font-size:0;line-height:0;">
      ${block.linkUrl ? `<a href="${block.linkUrl}" style="display:block;">` : ''}
      <img src="${block.imageUrl}" alt="" width="600"
        style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
      ${block.linkUrl ? `</a>` : ''}
    </td>
  </tr>`;
      i++;
    } else {
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

  // ── Footer ───────────────────────────────────────────────
  const socialIcons = Object.entries({
    twitter: socialLinks.twitter,
    facebook: socialLinks.facebook,
    instagram: socialLinks.instagram,
    youtube: socialLinks.youtube,
  })
    .filter(([, url]) => !!url)
    .map(
      ([name, url]) => `
    <td style="padding:0 6px;">
      <a href="${url}" style="display:inline-block;text-decoration:none;">
        <img src="${SOCIAL_ICONS[name]}" alt="${name}" width="28" height="28"
          style="display:block;width:28px;height:28px;border-radius:50%;
          background-color:#333333;border:0;" />
      </a>
    </td>`,
    )
    .join('');

  const footer = `
  <!-- Footer -->
  <tr>
    <td style="background:#111111;padding:32px 24px;text-align:center;">
      ${
        socialIcons
          ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
              <tr>${socialIcons}</tr>
             </table>`
          : ''
      }
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
