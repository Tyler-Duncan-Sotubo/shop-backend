// src/modules/catalog/controllers/reviews.controller.ts
import {
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Query,
  Body,
  SetMetadata,
  UseGuards,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { ReviewsService } from './reviews.service';
import { UpdateReviewDto } from './dto';
import { ApiKeyGuard } from '../iam/api-keys/guard/api-key.guard';
import { ApiScopes } from '../iam/api-keys/decorators/api-scopes.decorator';
import { CurrentCompanyId } from '../iam/api-keys/decorators/current-company-id.decorator';
import { StorefrontReviewQueryDto } from './dto/storefront-review-query.dto';
import { CreateStorefrontReviewDto } from './dto/create-storefront-review.dto';
import { UserAgent } from '../auth/decorator/user-agent';

@Controller('catalog/reviews')
export class ReviewsController extends BaseController {
  constructor(private readonly reviewsService: ReviewsService) {
    super();
  }

  // ----------------- List Reviews (admin) -----------------
  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reviews.read'])
  async listReviews(@CurrentUser() user: User, @Query() query: any) {
    return this.reviewsService.listReviews(user.companyId, query);
  }

  // ----------------- Reviews by Product (approved only) -----------------
  @Get('product/:productId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reviews.read'])
  async listReviewsByProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reviewsService.listReviewsByProduct(user.companyId, productId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  // ----------------- Moderate / Update Review -----------------
  @Patch(':reviewId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reviews.moderate']) // ⭐ you asked to use this scope for moderation/create
  async updateReview(
    @CurrentUser() user: User,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @Ip() ip: string,
  ) {
    return this.reviewsService.updateReview(
      user.companyId,
      reviewId,
      dto,
      user,
      ip,
    );
  }

  // ✅ STOREFRONT: List reviews for product
  @Get('storefront/:productId')
  @UseGuards(ApiKeyGuard)
  @ApiScopes('reviews.read')
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
  @UseGuards(ApiKeyGuard)
  @ApiScopes('reviews.create')
  async createStorefrontReview(
    @CurrentCompanyId() companyId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateStorefrontReviewDto,
    @Ip() ip: string,
    @UserAgent() userAgent: string,
  ) {
    return this.reviewsService.createStorefrontReview(
      companyId,
      productId,
      dto,
      ip,
      userAgent,
    );
  }
}
