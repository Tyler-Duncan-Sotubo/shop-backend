// src/channels/admin/subscriptions/subscriptions.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  RawBodyRequest,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from 'src/channels/admin/common/types/user.type';
import { SubscriptionPlansService } from 'src/domains/subscriptions/services/subscription-plans.service';
import { CompanySubscriptionsService } from 'src/domains/subscriptions/services/company-subscriptions.service';
import { CreditTopupService } from 'src/domains/subscriptions/services/credit-topup.service';
import { SubscriptionWebhookService } from 'src/domains/subscriptions/services/subscription-webhook.service';
import { SubscriptionInvoicesService } from 'src/domains/subscriptions/services/subscription-invoices.service';
import { SubscriptionPaymentService } from 'src/domains/subscriptions/services/subscription-payment.service';
import {
  CancelSubscriptionDto,
  InitiateTopupDto,
  InitiateSubscriptionDto,
  VerifyTopupDto,
} from './dto/subscriptions.dto';
import { Request } from 'express';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController extends BaseController {
  constructor(
    private readonly plans: SubscriptionPlansService,
    private readonly subscriptions: CompanySubscriptionsService,
    private readonly topup: CreditTopupService,
    private readonly invoices: SubscriptionInvoicesService,
    private readonly subscriptionPayment: SubscriptionPaymentService,
  ) {
    super();
  }

  // ── Plans ─────────────────────────────────────────────────
  @Get('plans')
  getPlans() {
    return this.plans.getAll();
  }

  // ── Current subscription ──────────────────────────────────
  @Get('me')
  getMySubscription(@CurrentUser() user: User) {
    return this.subscriptions.getWithPlan(user.companyId);
  }

  // ── Cancel subscription ───────────────────────────────────
  @Post('cancel')
  cancelSubscription(
    @CurrentUser() user: User,
    @Body() body: CancelSubscriptionDto,
  ) {
    return this.subscriptions.cancel(user.companyId, body.reason);
  }

  // ── Initiate plan subscription ────────────────────────────
  @Post('initiate')
  initiateSubscription(
    @CurrentUser() user: User,
    @Body() body: InitiateSubscriptionDto,
  ) {
    return this.subscriptionPayment.initiate(
      user.companyId,
      user.email,
      body.planId,
      body.billingCycle,
    );
  }

  // ── Verify subscription ───────────────────────────────────
  @Post('verify')
  verifySubscription(
    @CurrentUser() user: User,
    @Body() body: VerifyTopupDto, // reuse same DTO — just needs reference
  ) {
    return this.subscriptionPayment.verifyAndConfirm(
      user.companyId,
      body.reference,
    );
  }

  @Post('renew')
  renewSubscription(@CurrentUser() user: User) {
    return this.subscriptionPayment.initiateRenewal(user.companyId, user.email);
  }

  // ── Invoices ──────────────────────────────────────────────
  @Get('invoices')
  getInvoices(@CurrentUser() user: User) {
    return this.invoices.getByCompany(user.companyId);
  }

  // ── Credit bundles ────────────────────────────────────────
  @Get('credits/bundles')
  getBundles() {
    return this.topup.getBundles();
  }

  // ── Initiate credit topup ─────────────────────────────────
  @Post('credits/initiate')
  initiateTopup(@CurrentUser() user: User, @Body() body: InitiateTopupDto) {
    return this.topup.initiate(user.companyId, user.email, body.credits);
  }

  // ── Manual verify fallback ────────────────────────────────
  @Post('credits/verify')
  verifyTopup(@CurrentUser() user: User, @Body() body: VerifyTopupDto) {
    return this.topup.verifyAndConfirm(user.companyId, body.reference);
  }

  // ── Topup history ─────────────────────────────────────────
  @Get('credits/history')
  getTopupHistory(@CurrentUser() user: User) {
    return this.topup.getHistory(user.companyId);
  }
}

// ── Billing webhook — no JWT guard ───────────────────────────
@Controller('webhooks/paystack/billing')
export class BillingWebhookController extends BaseController {
  constructor(private readonly webhookService: SubscriptionWebhookService) {
    super();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = req.rawBody as Buffer;
    const { event } = this.webhookService.processWebhook(rawBody, signature);
    await this.webhookService.handleEvent(event);
    return { received: true };
  }
}
