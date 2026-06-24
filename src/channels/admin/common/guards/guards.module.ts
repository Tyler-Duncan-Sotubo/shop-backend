// src/modules/iam/guards/guards.module.ts
import { Global, Module } from '@nestjs/common';
import { PrimaryGuard } from './primary.guard';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PlanGuard } from './plan.guard';

@Global()
@Module({
  providers: [PrimaryGuard, JwtService, JwtAuthGuard, PlanGuard],
  exports: [PrimaryGuard, JwtService, JwtAuthGuard, PlanGuard],
})
export class GuardsModule {}
