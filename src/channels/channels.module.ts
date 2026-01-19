// channels/channels.module.ts
import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { StorefrontModule } from './storefront/storefront.module';

@Module({
  imports: [AdminModule, StorefrontModule],
})
export class ChannelsModule {}
