import { Body, Controller, Post, SetMetadata, UseGuards } from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { SetupCreateStoreAndDomainDto } from './dto/setup-store.dto';
import { SetupService } from 'src/domains/setup/setup.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('setup')
@UseGuards(JwtAuthGuard)
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  /**
   * Step 1: create store + domains + draft override (default base + default theme)
   */
  @Post('store')
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
  @SetMetadata('permissions', ['setup.complete'])
  markSetupCompleted(@CurrentUser() user: User) {
    return this.setupService.markSetupCompleted(user.id);
  }
}
