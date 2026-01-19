// src/modules/catalog/controllers/reviews.controller.ts
import {
  Controller,
  Get,
  Ip,
  Param,
  Query,
  Body,
  UseGuards,
  Post,
} from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { StorefrontReviewQueryDto } from './dto/storefront-review-query.dto';
import { CreateStorefrontReviewDto } from './dto/create-storefront-review.dto';
import { ReviewsService } from 'src/domains/reviews/reviews.service';
import { StorefrontGuard } from '../common/guard/storefront.guard';
import { CurrentCompanyId } from '../common/decorators/current-company-id.decorator';
import { CurrentStoreId } from '../common/decorators/current-store.decorator';
import { UserAgent } from '../common/decorators/user-agent';

@Controller('catalog/reviews')
export class ReviewsController extends BaseController {
  constructor(private readonly reviewsService: ReviewsService) {
    super();
  }

  @Get('storefront/:productId')
  @UseGuards(StorefrontGuard)
  async listStorefrontReviews(
    @CurrentCompanyId() companyId: string,
    @Param('productId') productId: string,
    @Query() query: StorefrontReviewQueryDto,
  ) {
    const reviews = await this.reviewsService.listStorefrontReviewsByProduct(
      companyId,
      productId,
      query,
    );
    return reviews;
  }

  // ✅ STOREFRONT: Create review for product (no login)
  @Post('storefront/:productId')
  @UseGuards(StorefrontGuard)
  async createStorefrontReview(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateStorefrontReviewDto,
    @Ip() ip: string,
    @UserAgent() userAgent: string,
  ) {
    return this.reviewsService.createStorefrontReview(
      companyId,
      storeId,
      productId,
      dto,
      ip,
      userAgent,
    );
  }
}
