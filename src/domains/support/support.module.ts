import { Module } from '@nestjs/common';
import { SupportFeedbackService } from './feedback.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SupportFeedbackService],
  exports: [SupportFeedbackService],
})
export class SupportModule {}
