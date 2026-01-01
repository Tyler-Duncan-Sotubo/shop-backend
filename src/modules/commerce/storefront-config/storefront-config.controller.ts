// src/modules/storefront-config/storefront-config.controller.ts
import { Controller, Get, UseGuards, Param, Body, Patch } from '@nestjs/common';
import { StorefrontConfigService } from './storefront-config.service';
import { ApiScopes } from 'src/modules/iam/api-keys/decorators/api-scopes.decorator';
import { ApiKeyGuard } from 'src/modules/iam/api-keys/guard/api-key.guard';
import { CurrentStoreId } from 'src/modules/iam/api-keys/decorators/current-store.decorator';
import { UpsertStorefrontConfigDto } from './dto/upsert-storefront-config.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('storefront-config')
export class StorefrontConfigController extends BaseController {
  constructor(private readonly service: StorefrontConfigService) {
    super();
  }

  @Get('config')
  @UseGuards(ApiKeyGuard)
  @ApiScopes('catalog.products.read')
  async getMyStorefrontConfig(@CurrentStoreId() storeId: string) {
    const cfg = await this.service.getByStoreId(storeId);
    return cfg;
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/:storeId')
  async get(@Param('storeId') storeId: string) {
    const cfg = await this.service.getByStoreId(storeId);
    return cfg;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:storeId')
  async upsert(
    @Param('storeId') storeId: string,
    @Body() dto: UpsertStorefrontConfigDto,
  ) {
    const cfg = await this.service.upsert(storeId, dto);
    return cfg;
  }
}
