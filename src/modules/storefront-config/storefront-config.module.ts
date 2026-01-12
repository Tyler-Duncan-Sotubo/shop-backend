import { Module } from '@nestjs/common';
import { StorefrontConfigService } from './services/storefront-config.service';
import { StorefrontConfigController } from './storefront-config.controller';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/common/aws/aws.service';
import { StorefrontOverrideService } from './services/storefront-override.service';
import { BaseThemeAdminService } from './services/base-theme-admin.service';
import { StorefrontRevalidateService } from './services/storefront-revalidate.service';

@Module({
  controllers: [StorefrontConfigController],
  providers: [
    StorefrontConfigService,
    ApiKeysService,
    StoresService,
    AwsService,
    StorefrontOverrideService,
    BaseThemeAdminService,
    StorefrontRevalidateService,
  ],
})
export class StorefrontConfigModule {}
