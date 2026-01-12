import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import type { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import { SetAnalyticsEnabledDto } from './dto/set-enabled.dto';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/modules/storefront-config/decorators/current-store.decorator';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';

@Controller('integrations/analytics')
export class AnalyticsController extends BaseController {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  /* ---------------------------------- */
  /* Admin (JWT)                         */
  /* ---------------------------------- */

  /**
   * List analytics integrations for a store (admin)
   * Example: GET /integrations/analytics/admin?storeId=xxx
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.analytics.read'])
  listAdmin(@CurrentUser() user: User, @Query('storeId') storeId: string) {
    return this.analyticsService.findAllForStore(user.companyId, storeId);
  }

  /**
   * Get one provider (admin)
   * GET /integrations/analytics/admin/ga4?storeId=xxx
   */
  @Get('admin/:provider')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.analytics.read'])
  getAdmin(
    @CurrentUser() user: User,
    @Param('provider') provider: string,
    @Query('storeId') storeId: string,
  ) {
    return this.analyticsService.findByProvider(
      user.companyId,
      storeId,
      provider,
    );
  }

  /**
   * Create/Upsert provider config (admin)
   * POST /integrations/analytics/admin?storeId=xxx
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.analytics.update'])
  upsertAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Body() dto: CreateAnalyticsDto,
    @Ip() ip: string,
  ) {
    return this.analyticsService.upsertForCompany(
      user.companyId,
      storeId,
      dto,
      user,
      ip,
    );
  }

  /**
   * Patch provider config (admin)
   * PATCH /integrations/analytics/admin/ga4?storeId=xxx
   */
  @Patch('admin/:provider')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.analytics.update'])
  updateAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Param('provider') provider: string,
    @Body() dto: UpdateAnalyticsDto,
    @Ip() ip: string,
  ) {
    return this.analyticsService.updateByProvider(
      user.companyId,
      storeId,
      provider,
      dto,
      user,
      ip,
    );
  }

  /**
   * Enable/disable provider (admin)
   * PATCH /integrations/analytics/admin/ga4/enabled?storeId=xxx
   */
  @Patch('admin/:provider/enabled')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.analytics.update'])
  setEnabledAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Param('provider') provider: string,
    @Body() dto: SetAnalyticsEnabledDto,
    @Ip() ip: string,
  ) {
    return this.analyticsService.setEnabled(
      user.companyId,
      storeId,
      provider,
      dto.enabled,
      user,
      ip,
    );
  }

  /**
   * Delete provider config (admin)
   * DELETE /integrations/analytics/admin/ga4?storeId=xxx
   */
  @Delete('admin/:provider')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.analytics.update'])
  removeAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Param('provider') provider: string,
    @Ip() ip: string,
  ) {
    return this.analyticsService.remove(
      user.companyId,
      storeId,
      provider,
      user,
      ip,
    );
  }

  /* ---------------------------------- */
  /* Storefront (API Key)                */
  /* ---------------------------------- */

  /**
   * Public storefront integrations (enabled only)
   * GET /integrations/analytics/storefront
   */
  @Get('storefront')
  @UseGuards(StorefrontGuard)
  getStorefront(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
  ) {
    return this.analyticsService.getPublicForStore(companyId, storeId);
  }
}
