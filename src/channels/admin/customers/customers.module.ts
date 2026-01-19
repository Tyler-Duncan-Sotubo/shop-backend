import { Module } from '@nestjs/common';
import { AdminCustomersController } from './admin-customers.controller';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [GuardsModule],
  controllers: [AdminCustomersController],
})
export class AdminCustomersModule {}
