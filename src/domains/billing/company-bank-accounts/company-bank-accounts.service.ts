import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { companyBankAccounts } from 'src/infrastructure/drizzle/schema';

export interface CreateBankAccountInput {
  label: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  tin?: string | null;
  sortOrder?: number;
}

export type UpdateBankAccountInput = Partial<CreateBankAccountInput>;

@Injectable()
export class CompanyBankAccountsService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async list(companyId: string) {
    return this.db
      .select()
      .from(companyBankAccounts)
      .where(eq(companyBankAccounts.companyId, companyId))
      .orderBy(asc(companyBankAccounts.sortOrder), asc(companyBankAccounts.createdAt))
      .execute();
  }

  async findById(companyId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(companyBankAccounts)
      .where(
        and(
          eq(companyBankAccounts.companyId, companyId),
          eq(companyBankAccounts.id, id),
        ),
      )
      .limit(1)
      .execute();

    if (!row) throw new NotFoundException('Bank account not found');
    return row;
  }

  async create(companyId: string, input: CreateBankAccountInput) {
    const [row] = await this.db
      .insert(companyBankAccounts)
      .values({
        companyId,
        label: input.label.trim(),
        bankName: input.bankName.trim(),
        accountName: input.accountName.trim(),
        accountNumber: input.accountNumber.trim(),
        tin: input.tin?.trim() ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning()
      .execute();

    return row;
  }

  async update(companyId: string, id: string, input: UpdateBankAccountInput) {
    await this.findById(companyId, id);

    const [row] = await this.db
      .update(companyBankAccounts)
      .set({
        ...(input.label !== undefined && { label: input.label.trim() }),
        ...(input.bankName !== undefined && { bankName: input.bankName.trim() }),
        ...(input.accountName !== undefined && { accountName: input.accountName.trim() }),
        ...(input.accountNumber !== undefined && { accountNumber: input.accountNumber.trim() }),
        ...(input.tin !== undefined && { tin: input.tin?.trim() ?? null }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(companyBankAccounts.companyId, companyId),
          eq(companyBankAccounts.id, id),
        ),
      )
      .returning()
      .execute();

    return row;
  }

  async remove(companyId: string, id: string) {
    await this.findById(companyId, id);

    await this.db
      .delete(companyBankAccounts)
      .where(
        and(
          eq(companyBankAccounts.companyId, companyId),
          eq(companyBankAccounts.id, id),
        ),
      )
      .execute();

    return { success: true };
  }
}
