import { Module } from '@nestjs/common';
import { PermissionsModule } from './permissions/permissions.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

@Module({
  imports: [PermissionsModule, ApiKeysModule],
  exports: [PermissionsModule, ApiKeysModule],
})
export class IamModule {}
