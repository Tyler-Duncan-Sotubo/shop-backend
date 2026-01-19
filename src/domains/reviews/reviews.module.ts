import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [ReviewsService, StoresService, AwsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
