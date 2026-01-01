import { Module } from '@nestjs/common';
import { StorefrontConfigService } from './storefront-config.service';
import { StorefrontConfigController } from './storefront-config.controller';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';

@Module({
  controllers: [StorefrontConfigController],
  providers: [StorefrontConfigService, ApiKeysService],
})
export class StorefrontConfigModule {}
