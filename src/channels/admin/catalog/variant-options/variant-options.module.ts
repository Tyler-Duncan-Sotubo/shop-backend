import { Module } from '@nestjs/common';
import { VariantOptionsController } from './variant-options.controller';

@Module({
  controllers: [VariantOptionsController],
})
export class AdminVariantOptionsModule {}
