import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { TaxService } from 'src/domains/billing/tax/tax.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';

const mockTx = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
};

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  transaction: jest.fn(),
};

const mockCacheService = {
  getOrSetVersioned: jest.fn(),
  bumpCompanyVersion: jest.fn().mockResolvedValue(undefined),
};

const mockAuditService = {
  logAction: jest.fn().mockResolvedValue(undefined),
};

const mockUser = {
  id: 'user-1',
  companyId: 'company-1',
};

const mockTaxRow = {
  id: 'tax-1',
  companyId: 'company-1',
  name: 'GST',
  code: 'GST',
  rateBps: 750,
  isInclusive: false,
  isDefault: false,
  isActive: true,
  storeId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TaxService', () => {
  let service: TaxService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx));

    mockTx.select.mockReturnThis();
    mockTx.from.mockReturnThis();
    mockTx.where.mockReturnThis();
    mockTx.limit.mockReturnThis();
    mockTx.execute.mockResolvedValue([]);
    mockTx.insert.mockReturnThis();
    mockTx.values.mockReturnThis();
    mockTx.returning.mockReturnThis();
    mockTx.update.mockReturnThis();
    mockTx.set.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: CacheService, useValue: mockCacheService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
  });

  describe('create', () => {
    it('saves a tax to the DB and returns it', async () => {
      mockTx.execute.mockResolvedValueOnce([mockTaxRow]);

      const dto = { storeId: 'store-1', name: 'GST', code: 'GST', rateBps: 750, isInclusive: false, isDefault: false, isActive: true };
      const result = await service.create(mockUser as any, dto);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
      expect(mockTx.values).toHaveBeenCalledWith(expect.objectContaining({ name: 'GST', rateBps: 750 }));
      expect(result).toEqual(mockTaxRow);
    });

    it('calls auditService.logAction after creating a tax', async () => {
      mockTx.execute.mockResolvedValueOnce([mockTaxRow]);

      const dto = { name: 'GST', rateBps: 750 };
      await service.create(mockUser as any, dto as any);

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          entity: 'tax',
          entityId: mockTaxRow.id,
          userId: mockUser.id,
        }),
      );
    });

    it('calls cache.bumpCompanyVersion after creating a tax', async () => {
      mockTx.execute.mockResolvedValueOnce([mockTaxRow]);

      const dto = { name: 'GST', rateBps: 750 };
      await service.create(mockUser as any, dto as any);

      expect(mockCacheService.bumpCompanyVersion).toHaveBeenCalledWith(mockUser.companyId);
    });

    it('throws BadRequestException when rateBps is negative', async () => {
      const dto = { name: 'GST', rateBps: -1 };
      await expect(service.create(mockUser as any, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when name is empty', async () => {
      const dto = { name: '   ', rateBps: 750 };
      await expect(service.create(mockUser as any, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('unsets other defaults before inserting when isDefault is true', async () => {
      mockTx.execute.mockResolvedValueOnce([]);
      mockTx.execute.mockResolvedValueOnce([mockTaxRow]);

      const dto = { name: 'GST', rateBps: 750, isDefault: true };
      await service.create(mockUser as any, dto as any);

      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalledWith(expect.objectContaining({ isDefault: false }));
    });

    it('throws BadRequestException when insert throws (duplicate name)', async () => {
      mockTx.execute.mockRejectedValueOnce(new Error('unique constraint'));

      const dto = { name: 'GST', rateBps: 750 };
      await expect(service.create(mockUser as any, dto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('modifies a tax in the DB and returns the updated row', async () => {
      const updatedRow = { ...mockTaxRow, name: 'VAT', rateBps: 1000 };

      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.execute.mockResolvedValueOnce([mockTaxRow]);

      mockTx.execute.mockResolvedValueOnce([updatedRow]);

      const dto = { name: 'VAT', rateBps: 1000 };
      const result = await service.update(mockUser as any, 'tax-1', dto as any);

      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'VAT', rateBps: 1000 }));
      expect(result).toEqual(updatedRow);
    });

    it('throws NotFoundException when getById finds no tax', async () => {
      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute.mockResolvedValueOnce([]);

      const dto = { name: 'VAT' };
      await expect(service.update(mockUser as any, 'nonexistent', dto as any)).rejects.toThrow(NotFoundException);
    });

    it('calls auditService.logAction after updating', async () => {
      const updatedRow = { ...mockTaxRow, rateBps: 1000 };

      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute.mockResolvedValueOnce([mockTaxRow]);
      mockTx.execute.mockResolvedValueOnce([updatedRow]);

      await service.update(mockUser as any, 'tax-1', { rateBps: 1000 } as any);

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          entity: 'tax',
          entityId: updatedRow.id,
          userId: mockUser.id,
        }),
      );
    });

    it('forces isDefault false when isActive is set to false', async () => {
      const updatedRow = { ...mockTaxRow, isActive: false, isDefault: false };

      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute.mockResolvedValueOnce([{ ...mockTaxRow, isDefault: true }]);
      mockTx.execute.mockResolvedValueOnce([updatedRow]);

      await service.update(mockUser as any, 'tax-1', { isActive: false } as any);

      expect(mockTx.set).toHaveBeenCalledWith(expect.objectContaining({ isDefault: false }));
    });
  });

  describe('list', () => {
    it('returns cached result via CacheService.getOrSetVersioned', async () => {
      const taxList = [mockTaxRow];
      mockCacheService.getOrSetVersioned.mockResolvedValue(taxList);

      const result = await service.list('company-1');

      expect(mockCacheService.getOrSetVersioned).toHaveBeenCalledWith(
        'company-1',
        expect.arrayContaining(['billing', 'taxes', 'list']),
        expect.any(Function),
        expect.objectContaining({ tags: expect.any(Array) }),
      );
      expect(result).toEqual(taxList);
    });

    it('queries DB inside the cache factory when cache misses', async () => {
      const taxList = [mockTaxRow];
      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute.mockResolvedValueOnce(taxList);

      const result = await service.list('company-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(taxList);
    });

    it('falls back to company defaults when no store taxes found', async () => {
      const companyTaxes = [mockTaxRow];
      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(companyTaxes);

      const result = await service.list('company-1', { storeId: 'store-1' });

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual(companyTaxes);
    });

    it('returns store taxes directly when store taxes exist', async () => {
      const storeTaxes = [{ ...mockTaxRow, storeId: 'store-1' }];
      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute.mockResolvedValueOnce(storeTaxes);

      const result = await service.list('company-1', { storeId: 'store-1' });

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(result).toEqual(storeTaxes);
    });
  });

  describe('getById', () => {
    it('returns a tax row when found', async () => {
      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute.mockResolvedValueOnce([mockTaxRow]);

      const result = await service.getById('company-1', 'tax-1');

      expect(result).toEqual(mockTaxRow);
    });

    it('throws NotFoundException when tax does not exist', async () => {
      mockCacheService.getOrSetVersioned.mockImplementationOnce((_cId: any, _keys: any, fn: () => any) => fn());
      mockDb.execute.mockResolvedValueOnce([]);

      await expect(service.getById('company-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('calls getOrSetVersioned with correct cache key structure', async () => {
      mockCacheService.getOrSetVersioned.mockResolvedValue(mockTaxRow);

      await service.getById('company-1', 'tax-1');

      expect(mockCacheService.getOrSetVersioned).toHaveBeenCalledWith(
        'company-1',
        ['taxes', 'byId', 'tax-1'],
        expect.any(Function),
        expect.objectContaining({ tags: expect.any(Array) }),
      );
    });

    it('returns cached value without hitting DB on cache hit', async () => {
      mockCacheService.getOrSetVersioned.mockResolvedValue(mockTaxRow);

      const result = await service.getById('company-1', 'tax-1');

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(result).toEqual(mockTaxRow);
    });
  });
});
