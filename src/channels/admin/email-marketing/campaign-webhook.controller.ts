// src/channels/admin/email-marketing/campaign-webhook.controller.ts
import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { Webhook } from 'svix';
import { CampaignWebhookService } from 'src/domains/email-marketing/services/campaign-webhook.service';

@Controller('webhooks/resend')
export class CampaignWebhookController {
  private readonly logger = new Logger(CampaignWebhookController.name);

  constructor(
    private readonly webhookService: CampaignWebhookService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');

    if (!secret) {
      this.logger.warn('RESEND_WEBHOOK_SECRET not set — skipping verification');
    } else {
      const rawBody = req.rawBody;

      if (!rawBody) {
        throw new BadRequestException('Raw body not available.');
      }

      try {
        const wh = new Webhook(secret);
        wh.verify(rawBody.toString(), {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (err) {
        this.logger.warn('Invalid Resend webhook signature', err);
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    return this.webhookService.handle(req.body as any);
  }
}
