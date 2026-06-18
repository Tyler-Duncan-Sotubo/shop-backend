// src/channels/admin/subscriptions/dto/subscriptions.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsIn(['monthly', 'annual'])
  billingCycle!: 'monthly' | 'annual';
}

export class InitiateTopupDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  credits!: number;
}

export class VerifyTopupDto {
  @IsString()
  @IsNotEmpty()
  reference!: string;
}

export class CancelSubscriptionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
