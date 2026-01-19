import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { LoginDto } from '../dto/login.dto';
import { TokenDto, VerifyLoginDto } from '../dto/token.dto';
import { JwtType, User } from 'src/channels/admin/common/types/user.type';
import { AuthService } from 'src/domains/auth/services';
import { RefreshJwtGuard } from '../../common/guards/refresh.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthLoginController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ip: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const result = await this.auth.login(dto, ip);

    // short-circuit for 2FA setup/verify
    if ('status' in result) return result;

    const { user, backendTokens, permissions, onboardingCompleted } = result;

    reply.setCookie('Authentication', backendTokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    return {
      success: true,
      message: 'Login successful',
      user,
      backendTokens,
      permissions,
      onboardingCompleted,
    };
  }

  // 2FA
  @HttpCode(HttpStatus.OK)
  @Post('verify-code')
  async verifyLogin(
    @Body() dto: VerifyLoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ip: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const result = await this.auth.verifyCode(dto.tempToken, dto.code, ip);

    const { user, backendTokens, permissions, onboardingCompleted } = result;

    reply.setCookie('Authentication', backendTokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    return {
      success: true,
      message: 'Login successful',
      user,
      backendTokens,
      permissions,
      onboardingCompleted,
    };
  }

  @UseGuards(RefreshJwtGuard)
  @Post('refresh')
  async refreshToken(@CurrentUser() user: JwtType, @Body() dto: TokenDto) {
    return this.auth.refreshToken(user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.logout(user);

    // optionally clear cookie on logout
    reply.clearCookie('Authentication', { path: '/' });

    return result;
  }
}
