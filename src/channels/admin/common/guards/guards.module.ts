// src/modules/iam/guards/guards.module.ts
import { Global, Module } from '@nestjs/common';
import { PrimaryGuard } from './primary.guard';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  providers: [PrimaryGuard, JwtService, JwtAuthGuard],
  exports: [PrimaryGuard, JwtService, JwtAuthGuard],
})
export class GuardsModule {}
