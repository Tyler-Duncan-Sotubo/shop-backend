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
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { StorefrontGuard } from './guard/storefront.guard';
import { CurrentStoreId } from './decorators/current-store.decorator';
import { User } from 'src/common/types/user.type';
// ✅ services (split)
import { StorefrontConfigService } from './services/storefront-config.service';
import { StorefrontOverrideService } from './services/storefront-override.service';
import { BaseThemeAdminService } from './services/base-theme-admin.service';

// ✅ DTOs
import { CreateBaseDto, UpdateBaseDto } from './dto/base-theme.dto';
import { CreateThemeDto, UpdateThemeDto } from './dto/theme.dto';
import { UpsertStorefrontOverrideDto } from './dto/upsert-storefront-override.dto';
import { CurrentUser } from '../auth/decorator/current-user.decorator';

@Controller('storefront-config')
export class StorefrontConfigController extends BaseController {
  constructor(
    private readonly runtime: StorefrontConfigService,
    private readonly overrides: StorefrontOverrideService,
    private readonly admin: BaseThemeAdminService,
  ) {
    super();
  }

  /* ===================================================================== */
  /* STOREFRONT (public runtime)                                            */
  /* ===================================================================== */

  /** Storefront runtime: returns resolved StorefrontConfigV1 for the current store */
  @Get('config')
  @UseGuards(StorefrontGuard)
  async getMyResolvedConfig(@CurrentStoreId() storeId: string) {
    return this.runtime.getResolvedByStoreId(storeId);
  }

  /* ADMIN: STORE OVERRIDES  */
  @UseGuards(JwtAuthGuard)
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
  /* ADMIN: STORE OVERRIDES                                                 */
  /* ===================================================================== */

  @UseGuards(JwtAuthGuard)
  @Get('admin/stores/:storeId/override')
  async getStorePublishedOverride(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.overrides.getPublishedOverride(user.companyId, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/stores/:storeId/override')
  async upsertStoreOverride(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Body() dto: UpsertStorefrontOverrideDto,
  ) {
    return this.overrides.upsertOverride(user.companyId, storeId, dto);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post('admin/bases')
  async createBase(@Body() dto: CreateBaseDto) {
    return this.admin.createBase(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/bases')
  async listBases(@Query('activeOnly') activeOnly?: string) {
    return this.admin.listBases({
      activeOnly: activeOnly === 'true',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/bases/:baseId')
  async getBase(@Param('baseId') baseId: string) {
    return this.admin.getBaseById(baseId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/bases/:baseId')
  async updateBase(
    @CurrentUser() user: User,
    @Param('baseId') baseId: string,
    @Body() dto: UpdateBaseDto,
  ) {
    return this.admin.updateBase(baseId, dto);
  }

  @UseGuards(JwtAuthGuard)
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
}
