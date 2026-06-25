import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanySubscriptionsService } from 'src/domains/subscriptions/services/company-subscriptions.service';
import { SubscriptionPlansService } from 'src/domains/subscriptions/services/subscription-plans.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';

const COMPANY_ID = 'a1b2c3d4-0000-4000-8000-000000000001';
const PLAN_ID = 'b2c3d4e5-0000-4000-8000-000000000002';
const FREE_PLAN_ID = 'c3d4e5f6-0000-4000-8000-000000000003';
const CUSTOM_PLAN_ID = 'd4e5f6a7-0000-4000-8000-000000000004';
const SUB_ID = 'e5f6a7b8-0000-4000-8000-000000000005';

const freePlan = { id: FREE_PLAN_ID, name: 'Free' };
const customPlan = { id: CUSTOM_PLAN_ID, name: 'Custom' };
const paidPlan = { id: PLAN_ID, name: 'Pro' };

function makeSubscription(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: SUB_ID,
    companyId: COMPANY_ID,
    planId: PLAN_ID,
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
    trialEndsAt: null,
    cancelledAt: null,
    cancelReason: null,
    paystackCustomerCode: null,
    paystackSubscriptionCode: null,
    paystackEmailToken: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
}

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
  onConflictDoNothing: jest.fn().mockReturnThis(),
};

const mockPlans = {
  getFreePlan: jest.fn(),
  getById: jest.fn(),
  getByName: jest.fn(),
};

const mockCache = {
  getOrSetVersioned: jest.fn(),
  bumpCompanyVersion: jest.fn(),
};

describe('CompanySubscriptionsService', () => {
  let service: CompanySubscriptionsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.execute.mockResolvedValue([]);
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.returning.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.onConflictDoNothing.mockReturnThis();

    mockCache.bumpCompanyVersion.mockResolvedValue(undefined);
    mockCache.getOrSetVersioned.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanySubscriptionsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: SubscriptionPlansService, useValue: mockPlans },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<CompanySubscriptionsService>(CompanySubscriptionsService);
  });

  describe('startTrial', () => {
    it('inserts subscription with status=trialing', async () => {
      mockPlans.getFreePlan.mockResolvedValue(freePlan);

      await service.startTrial(COMPANY_ID);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_ID,
          planId: FREE_PLAN_ID,
          status: 'trialing',
        }),
      );
    });

    it('sets trialEndsAt 14 days from now', async () => {
      mockPlans.getFreePlan.mockResolvedValue(freePlan);

      const before = Date.now();
      await service.startTrial(COMPANY_ID);
      const after = Date.now();

      const insertedValues = mockDb.values.mock.calls[0][0];
      const trialEndsAt: Date = insertedValues.trialEndsAt;

      const expectedMs = 14 * 24 * 60 * 60 * 1000;
      const diffMs = trialEndsAt.getTime() - before;

      expect(diffMs).toBeGreaterThanOrEqual(expectedMs - 1000);
      expect(trialEndsAt.getTime() - after).toBeLessThanOrEqual(expectedMs + 1000);
    });

    it('calls cache.bumpCompanyVersion with companyId', async () => {
      mockPlans.getFreePlan.mockResolvedValue(freePlan);

      await service.startTrial(COMPANY_ID);

      expect(mockCache.bumpCompanyVersion).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe('getByCompany', () => {
    it('returns null when no subscription found', async () => {
      mockDb.execute.mockResolvedValue([]);

      const result = await service.getByCompany(COMPANY_ID);

      expect(result).toBeNull();
    });

    it('returns subscription when found', async () => {
      const sub = makeSubscription();
      mockDb.execute.mockResolvedValue([sub]);

      const result = await service.getByCompany(COMPANY_ID);

      expect(result).toEqual(sub);
    });
  });

  describe('getByCompanyOrThrow', () => {
    it('throws NotFoundException when no subscription found', async () => {
      mockDb.execute.mockResolvedValue([]);

      await expect(service.getByCompanyOrThrow(COMPANY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns subscription when found', async () => {
      const sub = makeSubscription();
      mockDb.execute.mockResolvedValue([sub]);

      const result = await service.getByCompanyOrThrow(COMPANY_ID);

      expect(result).toEqual(sub);
    });
  });

  describe('getWithPlan', () => {
    it('calls cache.getOrSetVersioned with the subscription:with-plan key', async () => {
      mockCache.getOrSetVersioned.mockResolvedValue(null);

      await service.getWithPlan(COMPANY_ID);

      expect(mockCache.getOrSetVersioned).toHaveBeenCalledWith(
        COMPANY_ID,
        ['subscription:with-plan'],
        expect.any(Function),
        expect.objectContaining({ ttlSeconds: expect.any(Number) }),
      );
    });

    it('returns merged sub+plan from cache compute function', async () => {
      const sub = makeSubscription();
      mockDb.execute.mockResolvedValue([sub]);
      mockPlans.getById.mockResolvedValue(paidPlan);

      mockCache.getOrSetVersioned.mockImplementation(
        async (_companyId, _keys, compute) => compute(),
      );

      const result = await service.getWithPlan(COMPANY_ID);

      expect(result).toMatchObject({ ...sub, plan: paidPlan });
    });
  });

  describe('activate', () => {
    it('updates status to active', async () => {
      mockDb.execute.mockResolvedValue([]);

      await service.activate(COMPANY_ID, PLAN_ID, 'monthly');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });

    it('uses existing periodEnd as base when periodEnd is in the past (late payment)', async () => {
      const pastPeriodEnd = new Date('2026-06-01T00:00:00.000Z');
      const sub = makeSubscription({ currentPeriodEnd: pastPeriodEnd });
      mockDb.execute.mockResolvedValueOnce([sub]);
      mockDb.execute.mockResolvedValue([]);

      await service.activate(COMPANY_ID, PLAN_ID, 'monthly');

      const setArgs = mockDb.set.mock.calls[0][0];
      const expectedPeriodEnd = new Date(pastPeriodEnd);
      expectedPeriodEnd.setMonth(expectedPeriodEnd.getMonth() + 1);

      expect(setArgs.currentPeriodEnd.getTime()).toBe(expectedPeriodEnd.getTime());
    });

    it('uses now as base when no existing subscription', async () => {
      mockDb.execute.mockResolvedValueOnce([]);
      mockDb.execute.mockResolvedValue([]);

      const before = Date.now();
      await service.activate(COMPANY_ID, PLAN_ID, 'monthly');
      const after = Date.now();

      const setArgs = mockDb.set.mock.calls[0][0];
      const periodEnd: Date = setArgs.currentPeriodEnd;
      const expectedBase = new Date(before);
      expectedBase.setMonth(expectedBase.getMonth() + 1);

      expect(periodEnd.getTime()).toBeGreaterThanOrEqual(expectedBase.getTime() - 2000);
      expect(periodEnd.getTime()).toBeLessThanOrEqual(new Date(after).setMonth(new Date(after).getMonth() + 1) + 1000);
    });

    it('sets period end 1 year from base for annual billing', async () => {
      const pastPeriodEnd = new Date('2026-06-01T00:00:00.000Z');
      const sub = makeSubscription({ currentPeriodEnd: pastPeriodEnd, billingCycle: 'annual' });
      mockDb.execute.mockResolvedValueOnce([sub]);
      mockDb.execute.mockResolvedValue([]);

      await service.activate(COMPANY_ID, PLAN_ID, 'annual');

      const setArgs = mockDb.set.mock.calls[0][0];
      const expectedPeriodEnd = new Date(pastPeriodEnd);
      expectedPeriodEnd.setFullYear(expectedPeriodEnd.getFullYear() + 1);

      expect(setArgs.currentPeriodEnd.getTime()).toBe(expectedPeriodEnd.getTime());
    });

    it('sets period end 1 month from base for monthly billing', async () => {
      const pastPeriodEnd = new Date('2026-06-01T00:00:00.000Z');
      const sub = makeSubscription({ currentPeriodEnd: pastPeriodEnd });
      mockDb.execute.mockResolvedValueOnce([sub]);
      mockDb.execute.mockResolvedValue([]);

      await service.activate(COMPANY_ID, PLAN_ID, 'monthly');

      const setArgs = mockDb.set.mock.calls[0][0];
      const expectedPeriodEnd = new Date(pastPeriodEnd);
      expectedPeriodEnd.setMonth(expectedPeriodEnd.getMonth() + 1);

      expect(setArgs.currentPeriodEnd.getTime()).toBe(expectedPeriodEnd.getTime());
    });

    it('busts cache after activation', async () => {
      mockDb.execute.mockResolvedValue([]);

      await service.activate(COMPANY_ID, PLAN_ID, 'monthly');

      expect(mockCache.bumpCompanyVersion).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe('renew', () => {
    it('extends period from original periodEnd when overdue', async () => {
      const pastPeriodEnd = new Date('2026-06-01T00:00:00.000Z');
      const sub = makeSubscription({
        currentPeriodEnd: pastPeriodEnd,
        billingCycle: 'monthly',
      });
      mockDb.execute.mockResolvedValueOnce([sub]);
      mockDb.execute.mockResolvedValue([]);

      await service.renew(COMPANY_ID);

      const setArgs = mockDb.set.mock.calls[0][0];
      const expectedPeriodEnd = new Date(pastPeriodEnd);
      expectedPeriodEnd.setMonth(expectedPeriodEnd.getMonth() + 1);

      expect(setArgs.currentPeriodEnd.getTime()).toBe(expectedPeriodEnd.getTime());
      expect(setArgs.status).toBe('active');
    });

    it('busts cache after renewal', async () => {
      const sub = makeSubscription({
        currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      });
      mockDb.execute.mockResolvedValueOnce([sub]);
      mockDb.execute.mockResolvedValue([]);

      await service.renew(COMPANY_ID);

      expect(mockCache.bumpCompanyVersion).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe('markPastDue', () => {
    it('sets status to past_due', async () => {
      await service.markPastDue(COMPANY_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'past_due' }),
      );
    });

    it('busts cache after marking past due', async () => {
      await service.markPastDue(COMPANY_ID);

      expect(mockCache.bumpCompanyVersion).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe('markExpired', () => {
    it('sets status to expired', async () => {
      await service.markExpired(COMPANY_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'expired' }),
      );
    });

    it('busts cache after marking expired', async () => {
      await service.markExpired(COMPANY_ID);

      expect(mockCache.bumpCompanyVersion).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe('cancel', () => {
    it('sets status to cancelled with reason', async () => {
      await service.cancel(COMPANY_ID, 'Too expensive');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          cancelReason: 'Too expensive',
        }),
      );
    });

    it('sets cancelledAt to a Date', async () => {
      await service.cancel(COMPANY_ID, 'No longer needed');

      const setArgs = mockDb.set.mock.calls[0][0];
      expect(setArgs.cancelledAt).toBeInstanceOf(Date);
    });

    it('sets cancelReason to null when reason is not provided', async () => {
      await service.cancel(COMPANY_ID);

      const setArgs = mockDb.set.mock.calls[0][0];
      expect(setArgs.cancelReason).toBeNull();
    });

    it('busts cache after cancellation', async () => {
      await service.cancel(COMPANY_ID);

      expect(mockCache.bumpCompanyVersion).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe('assignCustomPlan', () => {
    it('throws NotFoundException when Custom plan not found', async () => {
      mockPlans.getByName.mockResolvedValue(null);

      await expect(service.assignCustomPlan(COMPANY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates existing subscription when one exists', async () => {
      mockPlans.getByName.mockResolvedValue(customPlan);
      const existing = makeSubscription();
      mockDb.execute.mockResolvedValueOnce([existing]);
      mockDb.execute.mockResolvedValue([]);

      await service.assignCustomPlan(COMPANY_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: CUSTOM_PLAN_ID,
          status: 'active',
        }),
      );
    });

    it('sets a 100-year period end when assigning custom plan', async () => {
      mockPlans.getByName.mockResolvedValue(customPlan);
      const existing = makeSubscription();
      mockDb.execute.mockResolvedValueOnce([existing]);
      mockDb.execute.mockResolvedValue([]);

      const before = new Date();
      await service.assignCustomPlan(COMPANY_ID);

      const setArgs = mockDb.set.mock.calls[0][0];
      const periodEnd: Date = setArgs.currentPeriodEnd;
      const expectedYear = before.getFullYear() + 100;

      expect(periodEnd.getFullYear()).toBe(expectedYear);
    });

    it('inserts new subscription when none exists', async () => {
      mockPlans.getByName.mockResolvedValue(customPlan);
      mockDb.execute.mockResolvedValueOnce([]);
      mockDb.execute.mockResolvedValue([]);

      await service.assignCustomPlan(COMPANY_ID);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_ID,
          planId: CUSTOM_PLAN_ID,
          status: 'active',
        }),
      );
    });

    it('busts cache after assigning custom plan', async () => {
      mockPlans.getByName.mockResolvedValue(customPlan);
      const existing = makeSubscription();
      mockDb.execute.mockResolvedValueOnce([existing]);
      mockDb.execute.mockResolvedValue([]);

      await service.assignCustomPlan(COMPANY_ID);

      expect(mockCache.bumpCompanyVersion).toHaveBeenCalledWith(COMPANY_ID);
    });
  });

  describe('isActive', () => {
    it('returns true for trialing status', async () => {
      const sub = makeSubscription({ status: 'trialing' });
      mockDb.execute.mockResolvedValue([sub]);

      const result = await service.isActive(COMPANY_ID);

      expect(result).toBe(true);
    });

    it('returns true for active status', async () => {
      const sub = makeSubscription({ status: 'active' });
      mockDb.execute.mockResolvedValue([sub]);

      const result = await service.isActive(COMPANY_ID);

      expect(result).toBe(true);
    });

    it('returns false for expired status', async () => {
      const sub = makeSubscription({ status: 'expired' });
      mockDb.execute.mockResolvedValue([sub]);

      const result = await service.isActive(COMPANY_ID);

      expect(result).toBe(false);
    });

    it('returns false for cancelled status', async () => {
      const sub = makeSubscription({ status: 'cancelled' });
      mockDb.execute.mockResolvedValue([sub]);

      const result = await service.isActive(COMPANY_ID);

      expect(result).toBe(false);
    });

    it('returns false when no subscription exists', async () => {
      mockDb.execute.mockResolvedValue([]);

      const result = await service.isActive(COMPANY_ID);

      expect(result).toBe(false);
    });
  });
});
