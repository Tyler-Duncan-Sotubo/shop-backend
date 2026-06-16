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

        const ids = Array.isArray(result?.data)
          ? result.data
              .map((r: { id?: string }) => r.id)
              .filter((id): id is string => !!id)
          : [];

        allMessageIds.push(...ids);
      }

      // ── Write sent events ──────────────────────────────────
      if (allMessageIds.length > 0) {
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

  // ── Social SVG icons ─────────────────────────────────────
  const SOCIAL_SVGS: Record<string, string> = {
    twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888888"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888888"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888888"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    youtube: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888888"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
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
        <a href="${url}" style="display:inline-block;width:32px;height:32px;
          background:#333333;border-radius:50%;text-align:center;line-height:36px;
          text-decoration:none;">
          ${SOCIAL_SVGS[name] ?? ''}
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
