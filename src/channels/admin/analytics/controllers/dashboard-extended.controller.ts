import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import {
  DashboardExtendedAnalyticsService,
  CompareMode,
} from 'src/domains/analytics/services/dashboard-extended-analytics.service';

@Controller('analytics/extended')
@UseGuards(JwtAuthGuard)
@SetMetadata('permissions', ['analytics.read'])
export class DashboardExtendedAnalyticsController extends BaseController {
  constructor(private readonly extended: DashboardExtendedAnalyticsService) {
    super();
  }

  private resolveArgs(
    companyId: string,
    from: string,
    to: string,
    storeId?: string,
    compareMode?: string,
    compareFrom?: string,
    compareTo?: string,
  ) {
    return {
      companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      compareMode: (compareMode ?? 'mom') as CompareMode,
      compareTo:
        compareMode === 'custom' && compareFrom && compareTo
          ? { from: new Date(compareFrom), to: new Date(compareTo) }
          : undefined,
    };
  }

  /**
   * Extended sales cards:
   * - AOV, net sales, gross sales, discount total, refund rate, refunded orders
   * + deltas vs comparison period
   *
   * GET /api/analytics/extended/admin/sales-cards?from=...&to=...&compareMode=mom
   */
  @Get('admin/sales-cards')
  async salesCards(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('compareMode') compareMode?: string,
    @Query('compareFrom') compareFrom?: string,
    @Query('compareTo') compareTo?: string,
  ) {
    return this.extended.extendedSalesCards(
      this.resolveArgs(
        user.companyId,
        from,
        to,
        storeId,
        compareMode,
        compareFrom,
        compareTo,
      ),
    );
  }

  /**
   * ABC product classification:
   * - A = top 70% revenue
   * - B = next 20%
   * - C = bottom 10%
   *
   * GET /api/analytics/extended/admin/abc?from=...&to=...&limit=100
   */
  @Get('admin/abc')
  async abcClassification(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('compareMode') compareMode?: string,
    @Query('compareFrom') compareFrom?: string,
    @Query('compareTo') compareTo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.extended.abcClassification({
      ...this.resolveArgs(
        user.companyId,
        from,
        to,
        storeId,
        compareMode,
        compareFrom,
        compareTo,
      ),
      limit: Number(limit ?? 100),
    });
  }

  /**
   * Sell-through rate per variant:
   * - unitsSold / (unitsSold + unitsAvailable)
   *
   * GET /api/analytics/extended/admin/sell-through?from=...&to=...&locationId=...
   */
  @Get('admin/sell-through')
  async sellThrough(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('compareMode') compareMode?: string,
    @Query('compareFrom') compareFrom?: string,
    @Query('compareTo') compareTo?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.extended.sellThroughRate({
      ...this.resolveArgs(
        user.companyId,
        from,
        to,
        storeId,
        compareMode,
        compareFrom,
        compareTo,
      ),
      locationId,
    });
  }

  /**
   * New vs returning customers timeseries:
   * - bucket=day|week|month
   *
   * GET /api/analytics/extended/admin/new-vs-returning?from=...&to=...&bucket=week
   */
  @Get('admin/new-vs-returning')
  async newVsReturning(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('compareMode') compareMode?: string,
    @Query('compareFrom') compareFrom?: string,
    @Query('compareTo') compareTo?: string,
    @Query('bucket') bucket?: 'day' | 'week' | 'month',
  ) {
    return this.extended.newVsReturning({
      ...this.resolveArgs(
        user.companyId,
        from,
        to,
        storeId,
        compareMode,
        compareFrom,
        compareTo,
      ),
      bucket: bucket ?? 'day',
    });
  }

  /**
   * Fulfillment time stats:
   * - avg fulfillment hours, on-time rate, total fulfilled
   * + deltas vs comparison period
   *
   * GET /api/analytics/extended/admin/fulfillment?from=...&to=...&onTimeThresholdHours=48
   */
  @Get('admin/fulfillment')
  async fulfillmentStats(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('compareMode') compareMode?: string,
    @Query('compareFrom') compareFrom?: string,
    @Query('compareTo') compareTo?: string,
    @Query('onTimeThresholdHours') onTimeThresholdHours?: string,
  ) {
    return this.extended.fulfillmentStats({
      ...this.resolveArgs(
        user.companyId,
        from,
        to,
        storeId,
        compareMode,
        compareFrom,
        compareTo,
      ),
      onTimeThresholdHours: Number(onTimeThresholdHours ?? 48),
    });
  }

  /**
   * Combined extended overview:
   * - all of the above in one request
   *
   * GET /api/analytics/extended/admin/overview?from=...&to=...&compareMode=yoy
   */
  @Get('admin/overview')
  async overview(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('compareMode') compareMode?: string,
    @Query('compareFrom') compareFrom?: string,
    @Query('compareTo') compareTo?: string,
    @Query('bucket') bucket?: 'day' | 'week' | 'month',
    @Query('locationId') locationId?: string,
    @Query('onTimeThresholdHours') onTimeThresholdHours?: string,
    @Query('abcLimit') abcLimit?: string,
  ) {
    const args = this.resolveArgs(
      user.companyId,
      from,
      to,
      storeId,
      compareMode,
      compareFrom,
      compareTo,
    );

    const [salesCards, abc, sellThrough, newVsRet, fulfillment] =
      await Promise.all([
        this.extended.extendedSalesCards(args),
        this.extended.abcClassification({
          ...args,
          limit: Number(abcLimit ?? 100),
        }),
        this.extended.sellThroughRate({ ...args, locationId }),
        this.extended.newVsReturning({ ...args, bucket: bucket ?? 'day' }),
        this.extended.fulfillmentStats({
          ...args,
          onTimeThresholdHours: Number(onTimeThresholdHours ?? 48),
        }),
      ]);

    return {
      salesCards,
      abcClassification: abc,
      sellThrough,
      newVsReturning: newVsRet,
      fulfillment,
      range: {
        from: args.from.toISOString(),
        to: args.to.toISOString(),
        compareMode: args.compareMode,
        comparisonRange: args.compareTo ?? null,
      },
    };
  }
}
