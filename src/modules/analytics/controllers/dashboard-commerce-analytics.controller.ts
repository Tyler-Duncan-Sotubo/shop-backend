import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { DashboardCommerceAnalyticsService } from '../services/dashboard-commerce-analytics.service';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('analytics/commerce')
@UseGuards(JwtAuthGuard)
@SetMetadata('permissions', ['analytics.read'])
export class DashboardCommerceAnalyticsController extends BaseController {
  constructor(private readonly commerce: DashboardCommerceAnalyticsService) {
    super();
  }

  /**
   * Cards:
   * - total sales
   * - total orders
   * - new customers
   * - web visits
   * + deltas vs previous period
   *
   * GET /api/analytics/commerce/admin/cards?from=...&to=...&storeId=...
   */
  @Get('admin/cards')
  async cards(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
  ) {
    const data = await this.commerce.cards({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
    });

    return data;
  }

  /**
   * Sales timeseries:
   * - bucket=day|month
   *
   * GET /api/analytics/commerce/admin/sales-timeseries?from=...&to=...&bucket=month
   */
  @Get('admin/sales-timeseries')
  async salesTimeseries(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('bucket') bucket?: '15m' | 'day' | 'month',
  ) {
    const data = await this.commerce.salesTimeseries({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      bucket: bucket ?? 'day',
    });

    return data;
  }

  /**
   * ✅ NEW: Gross sales cards
   * GET /api/analytics/commerce/admin/gross-sales-cards?from=...&to=...&storeId=...
   */
  @Get('admin/gross-sales-cards')
  async grossSalesCards(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.commerce.grossSalesCards({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
    });
  }
  /**
   * ✅ NEW: Latest payments table/card
   * GET /api/analytics/commerce/admin/latest-payments?from=...&to=...&limit=10
   */
  @Get('admin/latest-payments')
  async latestPayments(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commerce.latestPayments({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      limit: Number(limit ?? 10),
    });
  }

  /**
   * Top selling products:
   * - by=revenue|units
   * - limit=10...
   *
   * GET /api/analytics/commerce/admin/top-products?from=...&to=...&by=revenue&limit=10
   */
  @Get('admin/top-products')
  async topProducts(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
    @Query('by') by?: 'revenue' | 'units',
  ) {
    const data = await this.commerce.topSellingProducts({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      limit: Number(limit ?? 10),
      by: by ?? 'revenue',
    });

    return data;
  }

  /**
   * Recent orders (overview widget):
   * - limit=10...
   * - includeUnpaid=true|false (default false)
   * - orderBy=paidAt|createdAt (default createdAt)
   * - itemsPerOrder=3 (default 3)
   *
   * GET /api/analytics/commerce/admin/recent-orders?from=...&to=...&limit=10&orderBy=paidAt
   */
  @Get('admin/recent-orders')
  async recentOrders(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
    @Query('includeUnpaid') includeUnpaid?: string,
    @Query('orderBy') orderBy?: 'paidAt' | 'createdAt',
    @Query('itemsPerOrder') itemsPerOrder?: string,
  ) {
    const data = await this.commerce.recentOrders({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      limit: Number(limit ?? 5),
      orderBy: orderBy ?? 'createdAt',
      itemsPerOrder: Number(itemsPerOrder ?? 3),
    });

    return data;
  }

  @Get('admin/orders-by-channel')
  async ordersByChannel(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId: string,
    @Query('metric') metric?: 'orders' | 'revenue',
  ) {
    return this.commerce.ordersByChannelPie({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      metric: metric ?? 'orders',
    });
  }

  @Get('admin/overview')
  async overview(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') storeId?: string,
    @Query('topProductsLimit') topProductsLimit?: string,
    @Query('recentOrdersLimit') recentOrdersLimit?: string,
    @Query('paymentsLimit') paymentsLimit?: string,
    @Query('topProductsBy') topProductsBy?: 'revenue' | 'units',
  ) {
    return this.commerce.overview({
      companyId: user.companyId,
      storeId: storeId ?? null,
      from: new Date(from),
      to: new Date(to),
      topProductsLimit: Number(topProductsLimit ?? 5),
      recentOrdersLimit: Number(recentOrdersLimit ?? 5),
      paymentsLimit: Number(paymentsLimit ?? 5),
      topProductsBy: topProductsBy ?? 'revenue',
    });
  }
}
