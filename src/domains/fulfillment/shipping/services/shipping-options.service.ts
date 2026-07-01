import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { shippingOptions } from 'src/infrastructure/drizzle/schema';

export interface CreateShippingOptionDto {
  storeId: string;
  name: string;
  states?: string[];
  price?: string | number;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateShippingOptionDto = Partial<
  Omit<CreateShippingOptionDto, 'storeId'>
>;

@Injectable()
export class ShippingOptionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  async list(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['shipping', 'options', 'v1', storeId],
      async () => {
        return this.db
          .select()
          .from(shippingOptions)
          .where(
            and(
              eq(shippingOptions.companyId, companyId),
              eq(shippingOptions.storeId, storeId),
            ),
          )
          .orderBy(
            asc(shippingOptions.sortOrder),
            asc(shippingOptions.createdAt),
          )
          .execute();
      },
    );
  }

  async listForState(companyId: string, storeId: string, state?: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['shipping', 'options', 'storefront', 'v1', storeId, state ?? '__all__'],
      async () => {
        const baseWhere = and(
          eq(shippingOptions.companyId, companyId),
          eq(shippingOptions.storeId, storeId),
          eq(shippingOptions.isActive, true),
        );

        if (!state) {
          return this.db
            .select()
            .from(shippingOptions)
            .where(baseWhere)
            .orderBy(asc(shippingOptions.sortOrder))
            .execute();
        }

        return this.db
          .select()
          .from(shippingOptions)
          .where(
            and(
              baseWhere,
              sql`${shippingOptions.states} = '[]'::jsonb OR ${shippingOptions.states} @> ${JSON.stringify([state])}::jsonb`,
            ),
          )
          .orderBy(asc(shippingOptions.sortOrder))
          .execute();
      },
    );
  }

  async getById(id: string, companyId: string) {
    const [option] = await this.db
      .select()
      .from(shippingOptions)
      .where(
        and(
          eq(shippingOptions.id, id),
          eq(shippingOptions.companyId, companyId),
        ),
      )
      .limit(1)
      .execute();
    if (!option) throw new NotFoundException('Shipping option not found');
    return option;
  }

  async create(
    companyId: string,
    storeId: string,
    dto: CreateShippingOptionDto,
  ) {
    const [option] = await this.db
      .insert(shippingOptions)
      .values({
        companyId,
        storeId,
        name: dto.name,
        states: dto.states ?? [],
        price: dto.price != null ? String(dto.price) : '0',
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
    return option;
  }

  async update(id: string, companyId: string, dto: UpdateShippingOptionDto) {
    await this.getById(id, companyId);

    const patch: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.states !== undefined) patch.states = dto.states;
    if (dto.price !== undefined) patch.price = String(dto.price);
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    const [updated] = await this.db
      .update(shippingOptions)
      .set(patch)
      .where(
        and(
          eq(shippingOptions.id, id),
          eq(shippingOptions.companyId, companyId),
        ),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
    return updated;
  }

  async remove(id: string, companyId: string) {
    await this.getById(id, companyId);

    await this.db
      .delete(shippingOptions)
      .where(
        and(
          eq(shippingOptions.id, id),
          eq(shippingOptions.companyId, companyId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
    return { ok: true };
  }

  async toggle(id: string, companyId: string) {
    const existing = await this.getById(id, companyId);

    const [updated] = await this.db
      .update(shippingOptions)
      .set({
        isActive: !existing.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shippingOptions.id, id),
          eq(shippingOptions.companyId, companyId),
        ),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
    return updated;
  }
}
