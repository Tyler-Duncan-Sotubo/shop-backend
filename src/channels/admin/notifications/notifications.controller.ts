import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from 'src/channels/admin/common/types/user.type';
import { NotificationsService } from 'src/domains/notification/services/notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController extends BaseController {
  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notifications.list({
      companyId: user.companyId,
      userId: user.id,
      limit: Number(limit ?? 20),
      offset: Number(offset ?? 0),
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: User) {
    return this.notifications.unreadCount({
      companyId: user.companyId,
      userId: user.id,
    });
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notifications.markAsRead({
      notificationId: id,
      companyId: user.companyId,
    });
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: User) {
    return this.notifications.markAllAsRead({
      companyId: user.companyId,
      userId: user.id,
    });
  }
}
