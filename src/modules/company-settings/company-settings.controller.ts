import { Controller, Get, Post, Body, UseGuards, Patch } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { MarkOnboardingStepDto } from './dto/mark-onboarding-step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('company-settings')
@UseGuards(JwtAuthGuard)
export class CompanySettingsController extends BaseController {
  constructor(private readonly companySettingsService: CompanySettingsService) {
    super();
  }

  @Post('sync')
  syncAllCompanyPermissions() {
    return this.companySettingsService.syncAllCompanySettings();
  }

  // -----------------------------
  // GET /company-settings/onboarding
  // -----------------------------
  @Get('onboarding')
  async getOnboardingChecklist(@CurrentUser() user: User) {
    return this.companySettingsService.getOnboardingChecklist(user.companyId);
  }

  // -----------------------------
  // POST /company-settings/onboarding/step
  // -----------------------------
  @Post('onboarding/step')
  async markOnboardingStep(
    @CurrentUser() user: User,
    @Body() body: MarkOnboardingStepDto,
  ) {
    await this.companySettingsService.markOnboardingStep(
      user.companyId,
      body.step,
      body.value ?? true,
    );

    return { success: true };
  }

  // -----------------------------
  // GET /company-settings/general
  // -----------------------------
  @Get('general')
  async getGeneralSettings(@CurrentUser() user: User) {
    return this.companySettingsService.getGeneralSettings(user.companyId);
  }

  // -----------------------------
  // GET /company-settings/payments
  // -----------------------------
  @Get('payments')
  async getPaymentSettings(@CurrentUser() user: User) {
    return this.companySettingsService.getPaymentSettings(user.companyId);
  }

  // -----------------------------
  // GET /company-settings/security
  // -----------------------------
  @Get('security')
  async getSecuritySettings(@CurrentUser() user: User) {
    return this.companySettingsService.getSecuritySettings(user.companyId);
  }

  // -----------------------------
  // GET /company-settings/tax
  // -----------------------------
  @Get('tax')
  async getTaxSettings(@CurrentUser() user: User) {
    return this.companySettingsService.getTaxSettings(user.companyId);
  }

  // -----------------------------
  // GET /company-settings/checkout
  // -----------------------------
  @Get('checkout')
  async getCheckoutSettings(@CurrentUser() user: User) {
    return this.companySettingsService.getCheckoutSettings(user.companyId);
  }

  @Patch()
  async updateSetting(
    @CurrentUser() user: User,
    @Body() body: { key: string; value: string },
  ) {
    await this.companySettingsService.setSetting(
      user.companyId,
      body.key,
      body.value,
    );
  }
}
