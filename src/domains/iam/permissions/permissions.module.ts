import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CompanyAccessService } from './company-access.service';
import { PermissionsRegistryService } from './permissions-registry.service';

@Module({
  providers: [
    PermissionsRegistryService,
    CompanyAccessService,
    PermissionsService,
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}
