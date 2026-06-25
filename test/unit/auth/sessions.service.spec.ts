import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
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

describe('SessionsService', () => {
  let service: SessionsService;

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
        SessionsService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('createSession', () => {
    it('hashes token and calls db.insert', async () => {
      const row = {
        id: 'session-1',
        userId: 'user-1',
        companyId: 'company-1',
        refreshTokenHash: 'hashed',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        lastUsedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
      };
      mockDb.execute.mockResolvedValue([row]);

      await service.createSession({
        userId: 'user-1',
        companyId: 'company-1',
        refreshToken: 'raw-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          companyId: 'company-1',
          refreshTokenHash: expect.any(String),
        }),
      );
      const storedHash = (mockDb.values as jest.Mock).mock.calls[0][0].refreshTokenHash;
      expect(storedHash).not.toBe('raw-refresh-token');
      expect(storedHash).toHaveLength(64);
    });

    it('returns the inserted row', async () => {
      const row = {
        id: 'session-1',
        userId: 'user-1',
        companyId: 'company-1',
        refreshTokenHash: 'hashed',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        lastUsedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
      };
      mockDb.execute.mockResolvedValue([row]);

      const result = await service.createSession({
        userId: 'user-1',
        companyId: 'company-1',
        refreshToken: 'raw-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      });

      expect(result).toEqual(row);
    });
  });

  describe('revokeSession', () => {
    it('calls db.update with isRevoked=true', async () => {
      mockDb.execute.mockResolvedValue([]);

      await service.revokeSession('session-1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ isRevoked: true });
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('revokeAllForUser', () => {
    it('calls db.update with isRevoked=true for userId', async () => {
      mockDb.execute.mockResolvedValue([]);

      await service.revokeAllForUser('user-1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ isRevoked: true });
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('findValidSessionByToken', () => {
    it('returns null when no session found', async () => {
      mockDb.execute.mockResolvedValue([]);

      const result = await service.findValidSessionByToken('some-token');

      expect(result).toBeNull();
    });

    it('returns null when session is revoked', async () => {
      const row = {
        id: 'session-1',
        userId: 'user-1',
        companyId: 'company-1',
        refreshTokenHash: 'hashed',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
        lastUsedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
      };
      mockDb.execute.mockResolvedValue([row]);

      const result = await service.findValidSessionByToken('some-token');

      expect(result).toBeNull();
    });

    it('returns null when session is expired', async () => {
      const row = {
        id: 'session-1',
        userId: 'user-1',
        companyId: 'company-1',
        refreshTokenHash: 'hashed',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000),
        lastUsedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
      };
      mockDb.execute.mockResolvedValue([row]);

      const result = await service.findValidSessionByToken('some-token');

      expect(result).toBeNull();
    });

    it('returns session row when valid', async () => {
      const row = {
        id: 'session-1',
        userId: 'user-1',
        companyId: 'company-1',
        refreshTokenHash: 'hashed',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        lastUsedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
      };
      mockDb.execute.mockResolvedValue([row]);

      const result = await service.findValidSessionByToken('some-token');

      expect(result).toEqual(row);
    });
  });

  describe('touchSession', () => {
    it('updates lastUsedAt', async () => {
      mockDb.execute.mockResolvedValue([]);

      await service.touchSession('session-1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      );
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
