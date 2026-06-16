import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  creditBalance,
  creditTransactions,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { CreditChannel } from './inputs/credits.types';

@Injectable()
export class CreditService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // -----------------------
  // Helpers
  // -----------------------
  private async bumpCompany(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
  }

  // -----------------------
  // GET balance
  // -----------------------
  async getBalance(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['credits', 'balance', companyId],
      async () => {
        const [row] = await this.db
          .select()
          .from(creditBalance)
          .where(eq(creditBalance.companyId, companyId))
          .execute();

        if (!row) {
          return { balance: 0, lifetimeCredits: 0 };
        }

        return row;
      },
    );
  }

  // -----------------------
  // GET transactions
  // -----------------------
  async getTransactions(
    companyId: string,
    opts?: { channel?: CreditChannel; limit?: number; offset?: number },
  ) {
    const limit = Math.min(Number(opts?.limit ?? 50), 200);
    const offset = Number(opts?.offset ?? 0);

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'credits',
        'transactions',
        companyId,
        opts?.channel ?? 'all',
        String(limit),
        String(offset),
      ],
      async () => {
        const where = and(
          eq(creditTransactions.companyId, companyId),
          opts?.channel
            ? eq(creditTransactions.channel, opts.channel)
            : undefined,
        );

        const rows = await this.db
          .select()
          .from(creditTransactions)
          .where(where)
          .orderBy(desc(creditTransactions.createdAt))
          .limit(limit)
          .offset(offset)
          .execute();

        const [{ count }] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(creditTransactions)
          .where(where)
          .execute();

        return { rows, count: Number(count ?? 0), limit, offset };
      },
    );
  }

  // -----------------------
  // Top up (admin only)
  // -----------------------
  async topUp(
    companyId: string,
    amount: number,
    channel: CreditChannel,
    note?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than zero');
    }

    const result = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.companyId, companyId))
        .for('update')
        .execute();

      let newBalance: number;
      let newLifetime: number;

      if (!existing) {
        newBalance = amount;
        newLifetime = amount;

        await tx
          .insert(creditBalance)
          .values({
            companyId,
            balance: amount,
            lifetimeCredits: amount,
          })
          .execute();
      } else {
        newBalance = existing.balance + amount;
        newLifetime = existing.lifetimeCredits + amount;

        await tx
          .update(creditBalance)
          .set({
            balance: newBalance,
            lifetimeCredits: newLifetime,
            updatedAt: new Date(),
          })
          .where(eq(creditBalance.companyId, companyId))
          .execute();
      }

      const [tx_row] = await tx
        .insert(creditTransactions)
        .values({
          companyId,
          channel,
          type: 'topup',
          amount,
          balanceAfter: newBalance,
          note: note ?? null,
        })
        .returning()
        .execute();

      return {
        balance: newBalance,
        lifetimeCredits: newLifetime,
        transaction: tx_row,
      };
    });

    await this.bumpCompany(companyId);

    return result;
  }

  // -----------------------
  // Debit (called by send service)
  // -----------------------
  async debit(
    companyId: string,
    amount: number,
    channel: CreditChannel,
    referenceType: string,
    referenceId: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Debit amount must be greater than zero');
    }

    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.companyId, companyId))
        .for('update')
        .execute();

      if (!row) {
        throw new BadRequestException(
          'No credit balance found for this company',
        );
      }

      if (row.balance < amount) {
        throw new BadRequestException(
          `Insufficient credits. Required: ${amount}, available: ${row.balance}`,
        );
      }

      const newBalance = row.balance - amount;

      await tx
        .update(creditBalance)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(creditBalance.companyId, companyId))
        .execute();

      const [tx_row] = await tx
        .insert(creditTransactions)
        .values({
          companyId,
          channel,
          type: 'send',
          amount: -amount,
          balanceAfter: newBalance,
          referenceType,
          referenceId,
        })
        .returning()
        .execute();

      return { balance: newBalance, transaction: tx_row };
    });

    await this.bumpCompany(companyId);

    return result;
  }

  // -----------------------
  // Refund (called if send fails after debit)
  // -----------------------
  async refund(
    companyId: string,
    amount: number,
    channel: CreditChannel,
    referenceType: string,
    referenceId: string,
    note?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.companyId, companyId))
        .for('update')
        .execute();

      if (!row) {
        throw new NotFoundException('No credit balance found for this company');
      }

      const newBalance = row.balance + amount;

      await tx
        .update(creditBalance)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(creditBalance.companyId, companyId))
        .execute();

      const [tx_row] = await tx
        .insert(creditTransactions)
        .values({
          companyId,
          channel,
          type: 'refund',
          amount,
          balanceAfter: newBalance,
          referenceType,
          referenceId,
          note: note ?? 'Refund due to failed send',
        })
        .returning()
        .execute();

      return { balance: newBalance, transaction: tx_row };
    });

    await this.bumpCompany(companyId);

    return result;
  }

  // -----------------------
  // Manual adjustment (admin only)
  // -----------------------
  async adjust(
    companyId: string,
    amount: number,
    channel: CreditChannel,
    note: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.companyId, companyId))
        .for('update')
        .execute();

      if (!row) {
        throw new NotFoundException('No credit balance found for this company');
      }

      const newBalance = row.balance + amount;

      if (newBalance < 0) {
        throw new BadRequestException(
          `Adjustment would result in negative balance (${newBalance})`,
        );
      }

      await tx
        .update(creditBalance)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(creditBalance.companyId, companyId))
        .execute();

      const [tx_row] = await tx
        .insert(creditTransactions)
        .values({
          companyId,
          channel,
          type: 'adjustment',
          amount,
          balanceAfter: newBalance,
          note,
        })
        .returning()
        .execute();

      return { balance: newBalance, transaction: tx_row };
    });

    await this.bumpCompany(companyId);

    return result;
  }
}
