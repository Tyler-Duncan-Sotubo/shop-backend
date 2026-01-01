// src/modules/analytics/dto/track-event.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackEventDto {
  @IsString()
  sessionId!: string;

  @IsString()
  @MaxLength(64)
  event!: string;

  @IsOptional() @IsString() path?: string;
  @IsOptional() @IsString() referrer?: string;
  @IsOptional() @IsString() title?: string;

  // optional linkage
  @IsOptional() @IsString() cartId?: string;
  @IsOptional() @IsString() checkoutId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() paymentId?: string;

  @IsOptional() meta?: any;
}
