import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { StorefrontReviewQueryDto } from './dto/storefront-review-query.dto';
import { CreateStorefrontReviewDto } from './dto/create-storefront-review.dto';
import { ReviewsService } from 'src/domains/reviews/reviews.service';
export declare class ReviewsController extends BaseController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    listStorefrontReviews(companyId: string, productId: string, query: StorefrontReviewQueryDto): Promise<{
        id: string;
        product_id: string;
        reviewer: string;
        reviewer_email: string;
        rating: number;
        review: string;
        date_created: Date;
    }[]>;
    createStorefrontReview(companyId: string, storeId: string, productId: string, dto: CreateStorefrontReviewDto, ip: string, userAgent: string): Promise<{
        id: string;
        storeId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        userId: string | null;
        productId: string;
        authorName: string;
        authorEmail: string;
        rating: number;
        review: string;
        isApproved: boolean;
        approvedAt: Date | null;
        moderatedByUserId: string | null;
        moderatedAt: Date | null;
        moderationNote: string | null;
    }>;
}
