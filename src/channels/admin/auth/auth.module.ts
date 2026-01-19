import { Module } from '@nestjs/common';
import { AuthLoginController } from './controllers/auth-login.controller';
import { AuthUsersController } from './controllers/auth-users.controller';
import { AuthProfileController } from './controllers/auth-profile.controller';
import { AuthEmailController } from './controllers/auth-email.controller';
import { AuthModule } from 'src/domains/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    AuthLoginController,
    AuthUsersController,
    AuthProfileController,
    AuthEmailController,
  ],
})
export class AdminAuthModule {}
