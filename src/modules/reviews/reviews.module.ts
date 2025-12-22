import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ApiKeysService } from '../iam/api-keys/api-keys.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, ApiKeysService],
})
export class ReviewsModule {}
