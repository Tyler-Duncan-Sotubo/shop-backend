import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenGeneratorService } from 'src/domains/auth/services/token-generator.service';

describe('TokenGeneratorService', () => {
  let service: TokenGeneratorService;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenGeneratorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokenGeneratorService>(TokenGeneratorService);
    configService = module.get(ConfigService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('returns accessToken and refreshToken', async () => {
      configService.get.mockImplementation((key: string) => {
        const map: Record<string, string | number> = {
          JWT_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_EXPIRATION: 14400,
          JWT_REFRESH_EXPIRATION: 604800,
        };
        return map[key] as any;
      });

      jwtService.sign
        .mockReturnValueOnce('access-token-value')
        .mockReturnValueOnce('refresh-token-value');

      const result = await service.generateToken({ id: 'user-1', email: 'user@example.com' });

      expect(result).toEqual({
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException when JWT_SECRET is missing', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.generateToken({ id: 'user-1', email: 'user@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses default expiry when JWT_EXPIRATION is not set', async () => {
      configService.get.mockImplementation((key: string) => {
        const map: Record<string, any> = {
          JWT_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_EXPIRATION: undefined,
          JWT_REFRESH_EXPIRATION: undefined,
        };
        return map[key];
      });

      jwtService.sign
        .mockReturnValueOnce('access-token-default')
        .mockReturnValueOnce('refresh-token-default');

      await service.generateToken({ id: 'user-1', email: 'user@example.com' });

      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: 'user-1', email: 'user@example.com' },
        { secret: 'test-secret', expiresIn: 4 * 60 * 60 },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        { sub: 'user-1', email: 'user@example.com' },
        { secret: 'test-refresh-secret', expiresIn: 60 * 60 * 24 * 7 },
      );
    });
  });

  describe('generateTempToken', () => {
    it('returns a string token', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        return undefined;
      });
      jwtService.sign.mockReturnValue('temp-token-value');

      const result = await service.generateTempToken({ id: 'user-1', email: 'user@example.com' });

      expect(typeof result).toBe('string');
      expect(result).toBe('temp-token-value');
    });

    it('throws BadRequestException when JWT_SECRET is missing', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.generateTempToken({ id: 'user-1', email: 'user@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
