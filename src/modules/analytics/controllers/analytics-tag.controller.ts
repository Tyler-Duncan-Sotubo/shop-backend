// src/modules/analytics/analytics-tag.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { AnalyticsTagService } from '../services/analytics-tag.service';
import { CreateAnalyticsTagDto } from '../dto/create-analytics-tag.dto';

@Controller('analytics/tags')
export class AnalyticsTagController {
  constructor(private readonly tags: AnalyticsTagService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['analytics.write'])
  async list(@CurrentUser() user: User) {
    const data = await this.tags.listTags(user.companyId);
    return { data };
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['analytics.write'])
  async create(@CurrentUser() user: User, @Body() dto: CreateAnalyticsTagDto) {
    const data = await this.tags.createTag(user.companyId, user.id, dto);
    return { data };
  }

  @Patch('admin/:tagId/revoke')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['analytics.write'])
  async revoke(@CurrentUser() user: User, @Param('tagId') tagId: string) {
    const data = await this.tags.revokeTag(user.companyId, tagId);
    return { data };
  }
}
