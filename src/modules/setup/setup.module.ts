import { Module } from '@nestjs/common';
import { SetupService } from './setup.service';
import { SetupController } from './setup.controller';
import { StorefrontOverrideService } from '../storefront-config/services/storefront-override.service';
import { MediaService } from '../media/media.service';
import { StorefrontConfigService } from '../storefront-config/services/storefront-config.service';
import { StorefrontRevalidateService } from '../storefront-config/services/storefront-revalidate.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [SetupController],
  providers: [
    SetupService,
    StorefrontOverrideService,
    MediaService,
    StorefrontConfigService,
    StorefrontRevalidateService,
    AwsService,
  ],
})
export class SetupModule {}
