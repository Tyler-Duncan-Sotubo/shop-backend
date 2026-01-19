import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeysService } from 'src/domains/iam/api-keys/api-keys.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController extends BaseController {
  constructor(private readonly apiKeysService: ApiKeysService) {
    super();
  }

  @Get()
  @SetMetadata('permissions', ['apikeys.read'])
  async listCompanyKeys(
    @CurrentUser() user: User,
    @Query('storeId') storeId?: string,
  ) {
    return this.apiKeysService.listCompanyKeys(user.companyId, storeId);
  }

  @Post()
  @SetMetadata('permissions', ['apikeys.create'])
  async createApiKey(@CurrentUser() user: User, @Body() body: CreateApiKeyDto) {
    const { apiKey, rawKey } = await this.apiKeysService.createKey(
      user.companyId,
      body,
    );

    return {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        companyId: apiKey.companyId,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        lastUsedAt: apiKey.lastUsedAt,
      },
      rawKey, // show once
    };
  }

  @Patch(':id/revoke')
  @SetMetadata('permissions', ['apikeys.update'])
  async revokeApiKey(@CurrentUser() user: User, @Param('id') id: string) {
    await this.apiKeysService.revokeKey(user.companyId, id);
    return { message: 'API key revoked successfully' };
  }
}
