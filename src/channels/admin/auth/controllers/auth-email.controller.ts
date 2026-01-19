import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RequestPasswordResetDto, TokenDto } from '../dto/token.dto';
import { PasswordResetDto } from '../dto/user-email.dto';
import {
  PasswordResetService,
  VerificationService,
} from 'src/domains/auth/services';
import { LoginVerificationService } from 'src/domains/auth/services/login-verification.service';
import { User } from 'src/channels/admin/common/types/user.type';

import { ResponseInterceptor } from 'src/infrastructure/interceptor/error-interceptor';
import { Audit } from 'src/channels/admin/audit/audit.decorator';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthEmailController {
  constructor(
    private readonly verification: VerificationService,
    private readonly password: PasswordResetService,
    private readonly loginVerification: LoginVerificationService,
  ) {}

  @Post('resend-verification-email')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async resendVerificationEmail(@CurrentUser() user: User) {
    return this.verification.generateVerificationToken(user.id);
  }

  @Post('verify-email')
  @UseInterceptors(ResponseInterceptor)
  async verifyEmail(@Body() dto: TokenDto) {
    return this.verification.verifyToken(dto);
  }

  @Post('password-reset')
  @Audit({ action: 'Password Reset Request', entity: 'User' })
  @UseInterceptors(ResponseInterceptor)
  async passwordReset(@Body() dto: RequestPasswordResetDto): Promise<string> {
    return this.password.generatePasswordResetToken(dto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @Audit({ action: 'Reset Password', entity: 'User' })
  @UseInterceptors(ResponseInterceptor)
  async resetPassword(@Body() dto: PasswordResetDto, @Ip() ip: string) {
    return this.password.resetPassword(dto.token, dto.password, ip);
  }

  @HttpCode(HttpStatus.OK)
  @Post('invite-password-reset/:token')
  @UseInterceptors(ResponseInterceptor)
  async resetInvitationPassword(
    @Param('token') token: string,
    @Body() dto: PasswordResetDto,
  ) {
    return this.password.invitationPasswordReset(token, dto.password);
  }

  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ResponseInterceptor)
  @Post('resend-code')
  async resendCode(@Body('tempToken') token: string) {
    return this.loginVerification.regenerateVerificationToken(token);
  }
}
