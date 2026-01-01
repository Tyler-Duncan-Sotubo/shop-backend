// src/modules/analytics/controllers/dashboard-analytics.controller.ts
import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { DashboardAnalyticsService } from '../services/dashboard-analytics.service';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('analytics/dashboard')
@UseGuards(JwtAuthGuard)
@SetMetadata('permissions', ['analytics.read'])
export class DashboardAnalyticsController extends BaseController {
  constructor(private readonly dash: DashboardAnalyticsService) {
    super();
  }

  // /api/analytics/dashboard/overview?from=2025-12-01&to=2025-12-31&storeId=...
  @Get('overview')
  async overview(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
  ) {
    const data = await this.dash.overview({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
    });
    return data;
  }

  @Get('top-pages')
  async topPages(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.dash.topPages({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      limit: Number(limit ?? 20),
    });
    return data;
  }

  @Get('landing-pages')
  async landingPages(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.dash.landingPages({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      limit: Number(limit ?? 20),
    });
    return data;
  }

  // trend chart for the overview page
  @Get('timeseries')
  async timeseries(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('bucket') bucket?: 'hour' | 'day',
  ) {
    const data = await this.dash.timeseries({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      bucket: bucket ?? 'day',
    });
    return data;
  }
}
