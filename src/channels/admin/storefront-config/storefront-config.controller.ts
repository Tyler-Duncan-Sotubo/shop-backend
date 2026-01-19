// src/modules/storefront-config/storefront-config.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { User } from 'src/channels/admin/common/types/user.type';

// ✅ DTOs
import { CreateBaseDto, UpdateBaseDto } from './dto/base-theme.dto';
import { CreateThemeDto, UpdateThemeDto } from './dto/theme.dto';
import { UpsertStorefrontOverrideDto } from './dto/upsert-storefront-override.dto';
import { StorefrontConfigService } from 'src/domains/storefront-config/services/storefront-config.service';
import { BaseThemeAdminService } from 'src/domains/storefront-config/services/base-theme-admin.service';
import { StorefrontOverrideService } from 'src/domains/storefront-config/services/storefront-override.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('storefront-config')
@UseGuards(JwtAuthGuard)
export class StorefrontConfigController extends BaseController {
  constructor(
    private readonly runtime: StorefrontConfigService,
    private readonly overrides: StorefrontOverrideService,
    private readonly admin: BaseThemeAdminService,
  ) {
    super();
  }

  @Get('admin/stores/:storeId/config')
  async getAdminResolvedConfig(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Query('mode') mode?: 'draft' | 'published',
  ) {
    return this.runtime.getResolvedByStoreId(storeId, {
      overrideStatus: mode === 'draft' ? 'draft' : 'published',
    });
  }

  /* ===================================================================== */
  /* STORE OVERRIDES                                                 */
  /* ===================================================================== */

  @Get('admin/stores/:storeId/override')
  async getStorePublishedOverride(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.overrides.getPublishedOverride(user.companyId, storeId);
  }

  @Patch('admin/stores/:storeId/override')
  async upsertStoreOverride(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Body() dto: UpsertStorefrontOverrideDto,
  ) {
    return this.overrides.upsertOverride(user.companyId, storeId, dto);
  }

  @Post('admin/stores/:storeId/override/publish')
  async publishStoreOverride(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.overrides.publishDraft(user.companyId, storeId);
  }

  /* ===================================================================== */
  /* ADMIN: BASES (global; companyId comes from user for cache scoping)     */
  /* ===================================================================== */

  @Post('admin/bases')
  async createBase(@Body() dto: CreateBaseDto) {
    return this.admin.createBase(dto);
  }

  @Get('admin/bases')
  async listBases(@Query('activeOnly') activeOnly?: string) {
    return this.admin.listBases({
      activeOnly: activeOnly === 'true',
    });
  }

  @Get('admin/bases/:baseId')
  async getBase(@Param('baseId') baseId: string) {
    return this.admin.getBaseById(baseId);
  }

  @Patch('admin/bases/:baseId')
  async updateBase(
    @CurrentUser() user: User,
    @Param('baseId') baseId: string,
    @Body() dto: UpdateBaseDto,
  ) {
    return this.admin.updateBase(baseId, dto);
  }

  @Delete('admin/bases/:baseId')
  async deleteBase(@Param('baseId') baseId: string) {
    return this.admin.deleteBase(baseId);
  }

  /* ===================================================================== */
  /* ADMIN: THEMES (companyId always from CurrentUser)                      */
  /* ===================================================================== */

  @UseGuards(JwtAuthGuard)
  @Post('admin/themes')
  async createTheme(@CurrentUser() user: User, @Body() dto: CreateThemeDto) {
    return this.admin.createTheme(user.companyId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/themes')
  async listThemes(
    @CurrentUser() user: User,
    @Query('key') key?: string,
    @Query('storeId') storeId?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('scope') scope?: 'global' | 'company',
  ) {
    return this.admin.listThemes(user.companyId, {
      key,
      activeOnly: activeOnly === 'true',
      scope,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/themes/:themeId')
  async getTheme(@CurrentUser() user: User, @Param('themeId') themeId: string) {
    return this.admin.getThemeById(user.companyId, themeId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/themes/:themeId')
  async updateTheme(
    @CurrentUser() user: User,
    @Param('themeId') themeId: string,
    @Body() dto: UpdateThemeDto,
  ) {
    return this.admin.updateTheme(user.companyId, themeId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/themes/:themeId')
  async deleteTheme(
    @CurrentUser() user: User,
    @Param('themeId') themeId: string,
  ) {
    return this.admin.deleteTheme(user.companyId, themeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/stores/:storeId/theme-status')
  async getStoreThemeStatus(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.overrides.getStorefrontOverrideStatus(user.companyId, storeId);
  }
}
