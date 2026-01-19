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
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { UpdateReviewDto } from './dto';
import { ReviewsService } from 'src/domains/reviews/reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';

@Controller('catalog/reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController extends BaseController {
  constructor(private readonly reviewsService: ReviewsService) {
    super();
  }

  // ----------------- List Reviews (admin) -----------------
  @Get()
  @SetMetadata('permissions', ['reviews.read'])
  async listReviews(@CurrentUser() user: User, @Query() query: any) {
    return this.reviewsService.listReviews(user.companyId, query);
  }

  // ----------------- Reviews by Product (approved only) -----------------
  @Get('product/:productId')
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
}
