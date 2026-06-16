// src/channels/admin/email-marketing/dto/campaign.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsISO8601,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

const TEMPLATE_TYPES = ['new_arrival', 'promotion', 'newsletter'] as const;
const AUDIENCE_TYPES = ['all', 'customers', 'subscribers'] as const;
const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed',
] as const;

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(TEMPLATE_TYPES)
  templateType!: (typeof TEMPLATE_TYPES)[number];

  @IsString()
  @IsOptional()
  @IsIn(AUDIENCE_TYPES)
  audienceType?: (typeof AUDIENCE_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsOptional()
  previewText?: string | null;

  @IsString()
  @IsOptional()
  contentJson?: string | null;
}

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  @IsIn(TEMPLATE_TYPES)
  templateType?: (typeof TEMPLATE_TYPES)[number];

  @IsString()
  @IsOptional()
  @IsIn(AUDIENCE_TYPES)
  audienceType?: (typeof AUDIENCE_TYPES)[number];

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  subject?: string;

  @IsString()
  @IsOptional()
  previewText?: string | null;

  @IsString()
  @IsOptional()
  contentJson?: string | null;

  @IsISO8601()
  @IsOptional()
  scheduledAt?: string | null;
}

export class ScheduleCampaignDto {
  @IsISO8601()
  @IsNotEmpty()
  scheduledAt!: string;
}

export class SendTestDto {
  @IsEmail()
  @IsNotEmpty()
  toEmail!: string;
}

export class ListCampaignsDto {
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: (typeof CAMPAIGN_STATUSES)[number];

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  offset?: number;
}

export class AudienceCountDto {
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(AUDIENCE_TYPES)
  audienceType!: (typeof AUDIENCE_TYPES)[number];
}
