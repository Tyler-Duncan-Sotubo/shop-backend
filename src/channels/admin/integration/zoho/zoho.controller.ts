// src/channels/admin/integrations/zoho/zoho.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Patch,
  Post,
  Query,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import type { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { ZohoService } from 'src/domains/integration/zoho/zoho.service';
import { CreateZohoDto } from './dto/create-zoho.dto';
import { UpdateZohoDto } from './dto/update-zoho.dto';
import { SetZohoEnabledDto } from './dto/set-enabled.dto';
import { ZohoOAuthService } from 'src/domains/integration/zoho/zoho-oauth.service';
import { FastifyReply } from 'fastify';

@Controller('integrations/zoho')
export class ZohoController extends BaseController {
  constructor(
    private readonly zohoService: ZohoService,
    private readonly zohoOAuth: ZohoOAuthService,
  ) {
    super();
  }

  /**
   * GET /integrations/zoho/oauth/connect?storeId=xxx&region=com
   * returns { url }
   */
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.zoho.update'])
  async connect(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Query('region') region: string | undefined,
  ) {
    const url = await this.zohoOAuth.getConnectUrl({
      companyId: user.companyId,
      storeId,
      region,
      userId: user.id,
    });

    return { url };
  }

  /**
   * GET /integrations/zoho/oauth/callback?code=...&state=...
   * exchanges token, stores refresh token, redirects back to admin UI
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Ip() ip: string,
    @Res() reply: FastifyReply,
  ) {
    await this.zohoOAuth.handleCallback({ code, state, ip });

    const html = `<!doctype html><html><body>
    <script>
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "ZOHO_OAUTH_SUCCESS" }, "*");
        }
      } catch (e) {}
      setTimeout(() => window.close(), 200);
    </script>
    Zoho connected. You can close this tab.
  </body></html>`;

    return reply.type('text/html').send(html); // ✅ Fastify API
  }

  /* ---------------------------------- */
  /* Admin (JWT)                         */
  /* ---------------------------------- */

  /**
   * Get Zoho connection for a store (admin)
   * GET /integrations/zoho/admin?storeId=xxx
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.zoho.read'])
  getAdmin(@CurrentUser() user: User, @Query('storeId') storeId: string) {
    return this.zohoService.findForStore(user.companyId, storeId);
  }

  /**
   * Create/Upsert Zoho connection (admin)
   * POST /integrations/zoho/admin?storeId=xxx
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.zoho.update'])
  upsertAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Body() dto: CreateZohoDto,
    @Ip() ip: string,
  ) {
    return this.zohoService.upsertForStore(
      user.companyId,
      storeId,
      dto,
      user,
      ip,
    );
  }

  /**
   * Patch Zoho connection (admin)
   * PATCH /integrations/zoho/admin?storeId=xxx
   */
  @Patch('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.zoho.update'])
  updateAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Body() dto: UpdateZohoDto,
    @Ip() ip: string,
  ) {
    return this.zohoService.updateForStore(
      user.companyId,
      storeId,
      dto,
      user,
      ip,
    );
  }

  /**
   * Enable/disable Zoho (admin)
   * PATCH /integrations/zoho/admin/enabled?storeId=xxx
   */
  @Patch('admin/enabled')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.zoho.update'])
  setEnabledAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Body() dto: SetZohoEnabledDto,
    @Ip() ip: string,
  ) {
    return this.zohoService.setEnabled(
      user.companyId,
      storeId,
      dto.enabled,
      user,
      ip,
    );
  }

  /**
   * Delete Zoho connection (admin)
   * DELETE /integrations/zoho/admin?storeId=xxx
   */
  @Delete('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['integrations.zoho.update'])
  removeAdmin(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Ip() ip: string,
  ) {
    return this.zohoService.remove(user.companyId, storeId, user, ip);
  }
}
