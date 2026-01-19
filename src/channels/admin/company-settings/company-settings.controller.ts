import { Controller, Get, Post, Body, UseGuards, Patch } from '@nestjs/common';
import { MarkOnboardingStepDto } from './dto/mark-onboarding-step.dto';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanySettingsService } from 'src/domains/company-settings/company-settings.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';

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

  @Get('onboarding')
  async getOnboardingChecklist(@CurrentUser() user: User) {
    return this.companySettingsService.getOnboardingChecklist(user.companyId);
  }

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

  @Get('payments')
  async getPaymentSettings(@CurrentUser() user: User) {
    return this.companySettingsService.getPaymentSettings(user.companyId);
  }

  @Get('security')
  async getSecuritySettings(@CurrentUser() user: User) {
    return this.companySettingsService.getSecuritySettings(user.companyId);
  }

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
