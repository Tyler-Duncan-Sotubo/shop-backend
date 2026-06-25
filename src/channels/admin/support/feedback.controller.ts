import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from 'src/channels/admin/common/types/user.type';
import { SupportFeedbackService } from 'src/domains/support/feedback.service';
import { CreateFeedbackDto } from './dto/feedback.dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportFeedbackController extends BaseController {
  constructor(private readonly feedback: SupportFeedbackService) {
    super();
  }

  @Post('feedback')
  async create(@CurrentUser() user: User, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(dto, user.companyId);
  }
}
