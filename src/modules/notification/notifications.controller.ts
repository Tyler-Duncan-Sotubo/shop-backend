import { Controller } from '@nestjs/common';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('')
export class NotificationController extends BaseController {
  constructor() {
    super();
  }
}
