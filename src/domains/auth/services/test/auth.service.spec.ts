/// <reference types="jest" />
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
import * as bcrypt from 'bcryptjs';

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';

import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { AuthService } from 'src/domains/auth/services/auth.service';
import { UserService } from 'src/domains/auth/services/user.service';
import { TokenGeneratorService } from 'src/domains/auth/services/token-generator.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { LoginVerificationService } from 'src/domains/auth/services/login-verification.service';
import { PermissionsService } from 'src/domains/iam/permissions/permissions.service';
import { CompanySettingsService } from 'src/domains/company-settings/company-settings.service';
import { SessionsService } from 'src/domains/auth/services/sessions.service';

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  onConflictDoNothing: jest.fn().mockReturnThis(),
};

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  password: 'hashed-password',
  companyId: 'company-1',
  companyRoleId: 'role-1',
  lastLogin: new Date(Date.now() - 1000 * 60 * 60),
  verificationCode: null,
  verificationCodeExpiresAt: null,
  onboardingCompleted: true,
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
};

const mockRole = { name: 'admin', id: 'role-1' };

const mockUpdatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  companyId: 'company-1',
  avatar: null,
  roleId: 'role-1',
  plan: 'pro',
  trialEndsAt: null,
  onboardingCompleted: true,
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let tokenGeneratorService: jest.Mocked<TokenGeneratorService>;
  let verifyLogin: jest.Mocked<LoginVerificationService>;
  let jwtService: jest.Mocked<JwtService>;
  let companySettingsService: jest.Mocked<CompanySettingsService>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let sessionService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    Object.values(mockDb).forEach((fn) => {
      if (typeof fn === 'function') {
        (fn as jest.Mock).mockReset();
        if (fn !== mockDb.execute) {
          (fn as jest.Mock).mockReturnThis();
        } else {
          (fn as jest.Mock).mockResolvedValue([]);
        }
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: UserService,
          useValue: {
            findUserByEmail: jest.fn(),
          },
        },
        {
          provide: TokenGeneratorService,
          useValue: {
            generateToken: jest.fn(),
            generateTempToken: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: LoginVerificationService,
          useValue: {
            generateVerificationToken: jest.fn().mockResolvedValue('123456'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: CompanySettingsService,
          useValue: {
            getTwoFactorAuthSetting: jest.fn(),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            getPermissionKeysForUser: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            createSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
            revokeSession: jest.fn().mockResolvedValue(undefined),
            revokeAllForUser: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            setContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    tokenGeneratorService = module.get(TokenGeneratorService);
    verifyLogin = module.get(LoginVerificationService);
    jwtService = module.get(JwtService);
    companySettingsService = module.get(CompanySettingsService);
    permissionsService = module.get(PermissionsService);
    sessionService = module.get(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupSuccessfulLogin(overrides: Partial<typeof mockUser> = {}) {
    const user = { ...mockUser, ...overrides };
    userService.findUserByEmail.mockResolvedValue(user as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    mockDb.execute
      .mockResolvedValueOnce([mockRole])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockUpdatedUser]);

    companySettingsService.getTwoFactorAuthSetting.mockResolvedValue({
      twoFactorAuth: false,
    } as any);
    tokenGeneratorService.generateToken.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    permissionsService.getPermissionKeysForUser.mockResolvedValue([]);

    return user;
  }

  describe('login', () => {
    it('calls validateUser with lowercased email', async () => {
      setupSuccessfulLogin();

      await service.login(
        { email: 'User@Example.COM', password: 'pass' },
        '127.0.0.1',
      );

      expect(userService.findUserByEmail).toHaveBeenCalledWith(
        'user@example.com',
      );
    });

    it('throws BadRequestException when role not found', async () => {
      userService.findUserByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockDb.execute.mockResolvedValue([]);

      await expect(
        service.login(
          { email: 'user@example.com', password: 'pass' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns verification_required when 2FA needed', async () => {
      const oldLoginUser = {
        ...mockUser,
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 72),
      };
      userService.findUserByEmail.mockResolvedValue(oldLoginUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockDb.execute.mockResolvedValue([mockRole]);
      companySettingsService.getTwoFactorAuthSetting.mockResolvedValue({
        twoFactorAuth: true,
      } as any);
      tokenGeneratorService.generateTempToken.mockResolvedValue('temp-token');

      const result = await service.login(
        { email: 'user@example.com', password: 'pass' },
        '127.0.0.1',
      );

      expect(result).toMatchObject({
        status: 'verification_required',
        requiresVerification: true,
        tempToken: 'temp-token',
      });
      expect(verifyLogin.generateVerificationToken).toHaveBeenCalledWith(
        oldLoginUser.id,
      );
    });

    it('calls completeLogin when 2FA not needed', async () => {
      setupSuccessfulLogin();

      const result = await service.login(
        { email: 'user@example.com', password: 'pass' },
        '127.0.0.1',
      );

      expect(result).toHaveProperty('backendTokens');
      expect((result as any).backendTokens).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('verifyCode', () => {
    it('throws BadRequestException for invalid code', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      const userWithCode = {
        ...mockUser,
        verificationCode: '111111',
        verificationCodeExpiresAt: new Date(Date.now() + 600000),
      };
      mockDb.execute.mockResolvedValue([userWithCode]);

      await expect(
        service.verifyCode('temp-token', '999999', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired code', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      const userWithExpiredCode = {
        ...mockUser,
        verificationCode: '123456',
        verificationCodeExpiresAt: new Date(Date.now() - 1000),
      };
      mockDb.execute.mockResolvedValue([userWithExpiredCode]);

      await expect(
        service.verifyCode('temp-token', '123456', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('clears verification fields and calls completeLogin on success', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      const userWithCode = {
        ...mockUser,
        verificationCode: '123456',
        verificationCodeExpiresAt: new Date(Date.now() + 600000),
      };

      mockDb.execute
        .mockResolvedValueOnce([userWithCode])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockUpdatedUser]);

      tokenGeneratorService.generateToken.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      permissionsService.getPermissionKeysForUser.mockResolvedValue([]);

      const result = await service.verifyCode(
        'temp-token',
        '123456',
        '127.0.0.1',
      );

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationCode: null,
          verificationCodeExpiresAt: null,
        }),
      );
      expect(result).toHaveProperty('backendTokens');
    });
  });

  describe('refreshToken', () => {
    it('returns new accessToken and expiresIn', async () => {
      tokenGeneratorService.generateToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await service.refreshToken({
        sub: 'user-1',
        email: 'user@example.com',
        iat: 0,
        exp: 9999999999,
      });

      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        expiresIn: expect.any(Number),
      });
    });
  });

  describe('logout', () => {
    it('calls session.revokeSession with user.id', async () => {
      const user = {
        id: 'session-id-to-revoke',
        email: 'user@example.com',
        username: 'user',
        password: 'hash',
        role: 'admin' as const,
        companyId: 'company-1',
        permissions: [],
        firstName: 'Test',
        lastName: 'User',
      };

      await service.logout(user);

      expect(sessionService.revokeSession).toHaveBeenCalledWith(user.id);
    });
  });
});
