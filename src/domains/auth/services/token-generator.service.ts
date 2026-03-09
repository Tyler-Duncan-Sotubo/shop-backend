import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenGeneratorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private mustGetString(key: string) {
    const v = this.configService.get<string>(key);
    if (!v) throw new BadRequestException(`${key} is missing`);
    return v;
  }

  private getNumberOrDefault(key: string, def: number) {
    const v = this.configService.get<number>(key);
    return Number.isFinite(v as number) ? Number(v) : def;
  }

  async generateToken(user: any) {
    const payload = { sub: user.id, email: user.email };

    const accessSecret = this.mustGetString('JWT_SECRET');
    const refreshSecret = this.mustGetString('JWT_REFRESH_SECRET');

    const accessExpSeconds = this.getNumberOrDefault('JWT_EXPIRATION', 1200);
    const refreshExpSeconds = this.getNumberOrDefault(
      'JWT_REFRESH_EXPIRATION',
      60 * 60 * 24 * 7,
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpSeconds, // ✅ number (seconds)
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpSeconds, // ✅ number (seconds)
    });

    return { accessToken, refreshToken };
  }

  async generateTempToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    const secret = this.mustGetString('JWT_SECRET');

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: '60m',
    });
  }
}
