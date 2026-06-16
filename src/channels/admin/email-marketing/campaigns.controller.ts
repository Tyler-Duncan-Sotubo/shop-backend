// src/channels/admin/email-marketing/campaigns.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from 'src/channels/admin/common/types/user.type';
import { CampaignService } from 'src/domains/email-marketing/services/campaigns.service';
import { CampaignSendService } from 'src/domains/email-marketing/services/campaign-send.service';
import { CampaignAudienceService } from 'src/domains/email-marketing/services/campaign-audience.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  ScheduleCampaignDto,
  SendTestDto,
  ListCampaignsDto,
  AudienceCountDto,
} from './dto/campaign.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController extends BaseController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly campaignSendService: CampaignSendService,
    private readonly audienceService: CampaignAudienceService,
  ) {
    super();
  }

  // ── CRUD ────────────────────────────────────────────────────

  @Post()
  create(@CurrentUser() user: User, @Body() body: CreateCampaignDto) {
    return this.campaignService.create(user.companyId, body);
  }

  @Get()
  list(@CurrentUser() user: User, @Query() q: ListCampaignsDto) {
    return this.campaignService.list(user.companyId, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignService.getById(user.companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateCampaignDto,
  ) {
    return this.campaignService.update(user.companyId, id, body);
  }

  @Delete(':id')
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignService.delete(user.companyId, id);
  }

  // ── Scheduling ──────────────────────────────────────────────

  @Post(':id/schedule')
  schedule(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: ScheduleCampaignDto,
  ) {
    return this.campaignService.schedule(
      user.companyId,
      id,
      new Date(body.scheduledAt),
    );
  }

  @Post(':id/unschedule')
  unschedule(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignService.unschedule(user.companyId, id);
  }

  // ── Sending ─────────────────────────────────────────────────

  @Post(':id/send')
  sendNow(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignSendService.sendNow(user.companyId, id);
  }

  @Post(':id/test')
  sendTest(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: SendTestDto,
  ) {
    return this.campaignSendService.sendTest(user.companyId, id, body.toEmail);
  }

  // ── Audience preview ────────────────────────────────────────

  @Get('audience/count')
  audienceCount(@CurrentUser() user: User, @Query() q: AudienceCountDto) {
    return this.audienceService.count(
      user.companyId,
      q.storeId,
      q.audienceType,
    );
  }
}
