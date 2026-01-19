import { Module } from '@nestjs/common';
import { SetupService } from './setup.service';
import { StorefrontOverrideService } from '../storefront-config/services/storefront-override.service';
import { MediaService } from '../media/media.service';
import { StorefrontConfigService } from '../storefront-config/services/storefront-config.service';
import { StorefrontRevalidateService } from '../storefront-config/services/storefront-revalidate.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [
    SetupService,
    StorefrontOverrideService,
    MediaService,
    StorefrontConfigService,
    StorefrontRevalidateService,
    AwsService,
  ],
  exports: [SetupService],
})
export class SetupModule {}
