import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { StorefrontGuard } from '../common/guard/storefront.guard';
import { CurrentStoreId } from '../common/decorators/current-store.decorator';
import { StorefrontConfigService } from 'src/domains/storefront-config/services/storefront-config.service';

@Controller('storefront-config')
export class StorefrontConfigController extends BaseController {
  constructor(private readonly runtime: StorefrontConfigService) {
    super();
  }

  @Get('config')
  @UseGuards(StorefrontGuard)
  async getMyResolvedConfig(
    @CurrentStoreId() storeId: string,
    @Req() req: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    reply.header(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    reply.header('Vary', 'Host, X-Forwarded-Host, X-Store-Host');

    return this.runtime.getResolvedByStoreId(storeId, {
      host: req.storefront?.host, // 👈 pass host
    });
  }
}
