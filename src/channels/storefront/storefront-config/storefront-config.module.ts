import { Module } from '@nestjs/common';
import { StorefrontConfigController } from './storefront-config.controller';

@Module({
  controllers: [StorefrontConfigController],
})
export class StorefrontConfigModule {}
