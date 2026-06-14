import { Module } from '@nestjs/common';
import { SupportFeedbackService } from 'src/domains/support/feedback.service';
import { SupportFeedbackController } from './feedback.controller';

@Module({
  imports: [],
  controllers: [SupportFeedbackController],
  providers: [SupportFeedbackService],
})
export class SupportModule {}
