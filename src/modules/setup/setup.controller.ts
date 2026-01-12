import { Body, Controller, Post, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

import { SetupService } from './setup.service';
import { SetupCreateStoreAndDomainDto } from './dto/setup-store.dto';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  /**
   * Step 1: create store + domains + draft override (default base + default theme)
   */
  @Post('store')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['setup.create']) // pick a permission key you prefer
  createStoreWithDomains(
    @CurrentUser() user: User,
    @Body() dto: SetupCreateStoreAndDomainDto,
  ) {
    return this.setupService.createStoreWithDomains(user.companyId, dto, user);
  }

  /**
   * Completion: user can skip theme and continue later.
   */
  @Post('complete')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['setup.complete'])
  markSetupCompleted(@CurrentUser() user: User) {
    return this.setupService.markSetupCompleted(user.id);
  }
}
