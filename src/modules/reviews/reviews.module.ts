import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, StoresService, AwsService],
})
export class ReviewsModule {}
