import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';
import {
  UserService,
  TokenGeneratorService,
  AuthService,
  VerificationService,
  PasswordResetService,
} from './services';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrimaryGuard } from './guards/primary.guard';
import { AwsService } from 'src/common/aws/aws.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { LoginVerificationService } from './services/login-verification.service';
import { InvitationsService } from './services/invitations.service';
import { SessionsService } from './services/sessions.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_EXPIRATION')}s`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    UserService,
    TokenGeneratorService,
    AuthService,
    JwtStrategy,
    VerificationService,
    PasswordResetService,
    PrimaryGuard,
    ConfigService,
    AwsService,
    AuditService,
    LoginVerificationService,
    InvitationsService,
    SessionsService,
  ],
  exports: [
    UserService,
    TokenGeneratorService,
    AuthService,
    JwtStrategy,
    VerificationService,
    PasswordResetService,
    PrimaryGuard,
    InvitationsService,
    SessionsService,
  ],
})
export class AuthModule {}
