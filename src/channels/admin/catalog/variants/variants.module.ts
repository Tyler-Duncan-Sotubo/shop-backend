import { Module } from '@nestjs/common';
import { VariantsController } from './variants.controller';

@Module({
  controllers: [VariantsController],
})
export class AdminVariantsModule {}
