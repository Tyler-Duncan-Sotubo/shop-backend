import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  ne,
  or,
  sql,
  asc,
  inArray,
} from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  quoteRequests,
  quoteRequestItems,
} from 'src/infrastructure/drizzle/schema/commerce/quotes/quote-requests.schema';

import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { GetQuotesQueryDto } from './dto/get-quotes-query.dto';
import {
  inventoryLocations,
  productVariants,
  stores,
} from 'src/infrastructure/drizzle/schema';
import { ManualOrdersService } from '../orders/manual-orders.service';
import { QuoteNotificationService } from 'src/domains/notification/services/quote-notification.service';
import { ZohoBooksService } from 'src/domains/integration/zoho/zoho-books.service';

@Injectable()
export class QuoteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly manualOrdersService: ManualOrdersService,
    private readonly quoteNotification: QuoteNotificationService,
    private readonly zohoBooks: ZohoBooksService,
  ) {}

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async findQuoteByIdOrThrow(companyId: string, quoteId: string) {
    const row = await this.db.query.quoteRequests.findFirst({
      where: and(
        eq(quoteRequests.companyId, companyId),
        eq(quoteRequests.id, quoteId),
        isNull(quoteRequests.deletedAt),
      ),
    });

    if (!row) throw new NotFoundException('Quote not found');
    return row;
  }

  private async bumpCompany(companyId: string) {
    // Your cache uses company versioning, so this is the invalidation hook
    await this.cache.bumpCompanyVersion(companyId);
  }

  // --------------------------------------------------------------------------
  // CRUD
  // --------------------------------------------------------------------------

  /**
   * CREATE QUOTE
   *
   * ✅ Uses variantId to look up price from productVariants
   * ✅ Stores unitPriceSnapshot + currencySnapshot on quote_request_items
   * ✅ Prefers salesPrice when present (>0); falls back to price
   *
   * NOTE: Ensure quote_request_items schema has:
   *   - unitPriceSnapshot (number/numeric/int)
   *   - currencySnapshot (string/text)
   *
   * ALSO: Adjust the productVariants import/path + column names to match your schema.
   */
  async create(
    companyId: string,
    dto: CreateQuoteDto,
    user?: User,
    ip?: string,
  ) {
    const { storeId, customerEmail, customerNote, meta, expiresAt, items } =
      dto;

    if (!items?.length) {
      throw new BadRequestException('At least one quote item is required.');
    }

    const created = await this.db.transaction(async (tx) => {
      // -----------------------------
      // Create quote header
      // -----------------------------
      const [quote] = await tx
        .insert(quoteRequests)
        .values({
          companyId,
          storeId,
          customerEmail,
          customerNote,
          meta,
          expiresAt,
          status: 'new',
        })
        .returning()
        .execute();

      // -----------------------------
      // Bulk fetch variant pricing
      // -----------------------------
      const variantIds = Array.from(
        new Set(items.map((i) => i.variantId).filter(Boolean) as string[]),
      );

      // ✅ Adjust these fields to match your productVariants schema:
      //    - price (regular price)
      //    - salesPrice (optional sale price)
      //    - currency
      const variants = variantIds.length
        ? await tx
            .select({
              id: productVariants.id,
              price: productVariants.regularPrice,
              salesPrice: productVariants.salePrice,
              currency: productVariants.currency,
            })
            .from(productVariants)
            .where(inArray(productVariants.id, variantIds))
            .execute()
        : [];

      const variantById = new Map<
        string,
        { unitPrice: number | null; currency: string | null }
      >(
        variants.map((v) => {
          // ✅ salesPrice wins if it is set and > 0; otherwise fallback to price
          const hasSalesPrice =
            v.salesPrice !== null &&
            v.salesPrice !== undefined &&
            Number(v.salesPrice) > 0;

          const unitPrice = (hasSalesPrice ? v.salesPrice : v.price) ?? null;

          return [
            v.id,
            {
              unitPrice: unitPrice === null ? null : Number(unitPrice),
              currency: (v.currency as any) ?? null,
            },
          ];
        }),
      );

      // Optional but recommended: fail fast if variantId is provided but missing
      for (const it of items) {
        if (it.variantId && !variantById.has(it.variantId)) {
          throw new BadRequestException(`Variant not found: ${it.variantId}`);
        }
      }

      // -----------------------------
      // Insert quote items w/ price snapshot
      // -----------------------------
      await tx
        .insert(quoteRequestItems)
        .values(
          items.map((item, index) => {
            const pricing = item.variantId
              ? (variantById.get(item.variantId) ?? null)
              : null;

            return {
              quoteRequestId: quote.id,
              productId: item.productId ?? null,
              variantId: item.variantId ?? null,
              nameSnapshot: item.name,
              variantSnapshot: item.variantLabel ?? null,
              attributes: item.attributes ?? null,
              imageUrl: item.imageUrl ?? null,
              quantity: item.quantity ?? 1,
              position: index + 1,
              unitPriceMinor: pricing?.unitPrice ?? null,
            } as any;
          }),
        )
        .execute();

      return quote;
    });

    // -----------------------------
    // Notify store
    // -----------------------------
    const [store] = await this.db
      .select({ storeEmail: stores.storeEmail, name: stores.name })
      .from(stores)
      .where(eq(stores.id, dto.storeId))
      .limit(1);

    await this.quoteNotification.sendQuoteNotification({
      to: store?.storeEmail ? [store.storeEmail] : [''],
      fromName: store?.name || 'Quote Request',
      storeName: store?.name,
      quoteId: created.id,
      customerEmail: created.customerEmail,
      customerNote: created.customerNote ?? null,
      items: items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
      })),
    });

    await this.bumpCompany(companyId);

    // -----------------------------
    // Audit
    // -----------------------------
    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'quote_request',
        entityId: created.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created quote request',
        changes: {
          companyId,
          storeId: created.storeId,
          customerEmail: created.customerEmail,
          itemsCount: items.length,
        },
      });
    }

    return created;
  }

  async createFromStorefront(
    storeId: string,
    dto: CreateQuoteDto,
    ip?: string,
  ) {
    // Resolve companyId from store
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.create(
      store.companyId,
      {
        ...dto,
        storeId, // enforce
      },
      undefined,
      ip,
    );
  }

  /**
   * List quotes (store-scoped) + cached, with optional search & limit
   */
  async findAll(companyId: string, query: GetQuotesQueryDto) {
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const offset = Number(query.offset ?? 0);

    const where = and(
      eq(quoteRequests.companyId, companyId),

      // ✅ store scoped (from query, like your existing quotes list)
      eq(quoteRequests.storeId, query.storeId),

      // ✅ never show deleted
      isNull(quoteRequests.deletedAt),

      // ✅ filter by status (tabs)
      query.status ? eq(quoteRequests.status, query.status as any) : undefined,

      // ✅ exclude archived unless includeArchived = true
      query.includeArchived
        ? undefined
        : ne(quoteRequests.status, 'archived' as any),

      // ✅ search email/note
      query.search
        ? or(
            ilike(quoteRequests.id, `%${query.search}%`),
            ilike(quoteRequests.customerEmail, `%${query.search}%`),
            ilike(quoteRequests.customerNote, `%${query.search}%`),
          )
        : undefined,
    );

    const rows = await this.db
      .select()
      .from(quoteRequests)
      .where(where)
      .orderBy(desc(quoteRequests.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(quoteRequests)
      .where(where)
      .execute();

    return { rows, count: Number(count ?? 0), limit, offset };
  }
  /**
   * Get a single quote with items (cached)
   */
  async findOne(companyId: string, quoteId: string) {
    const cacheKey = ['quotes', quoteId];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const quote = await this.findQuoteByIdOrThrow(companyId, quoteId);

      const items = await this.db
        .select()
        .from(quoteRequestItems)
        .where(
          and(
            eq(quoteRequestItems.quoteRequestId, quoteId),
            isNull(quoteRequestItems.deletedAt),
          ),
        )
        .orderBy(quoteRequestItems.position)
        .execute();

      return { ...quote, items };
    });
  }

  /**
   * Update quote metadata / status (NOT items) + audit + bump cache
   */
  async update(
    companyId: string,
    quoteId: string,
    dto: UpdateQuoteDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findQuoteByIdOrThrow(companyId, quoteId);

    console.log('Existing quote status:', existing.status);

    if (
      dto.status &&
      dto.status !== existing.status &&
      existing.status === 'converted'
    ) {
      throw new BadRequestException('Converted quotes cannot change status');
    }

    const [updated] = await this.db
      .update(quoteRequests)
      .set({
        status: dto.status ?? existing.status,
        customerEmail: dto.customerEmail ?? existing.customerEmail,
        customerNote:
          dto.customerNote === undefined
            ? existing.customerNote
            : dto.customerNote,
        meta: dto.meta ?? existing.meta,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(quoteRequests.id, quoteId),
          eq(quoteRequests.companyId, companyId),
          isNull(quoteRequests.deletedAt),
        ),
      )
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Quote not found');

    await this.bumpCompany(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'quote_request',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated quote request',
        changes: {
          companyId,
          quoteId,
          before: {
            status: existing.status,
            customerEmail: existing.customerEmail,
            customerNote: existing.customerNote ?? null,
            meta: existing.meta ?? null,
            archivedAt: existing.archivedAt ?? null,
          },
          after: {
            status: updated.status,
            customerEmail: updated.customerEmail,
            customerNote: updated.customerNote ?? null,
            meta: updated.meta ?? null,
            archivedAt: updated.archivedAt ?? null,
          },
        },
      });
    }

    return updated;
  }

  /**
   * Soft delete + audit + bump cache
   */
  async remove(companyId: string, quoteId: string, user?: User, ip?: string) {
    const existing = await this.findQuoteByIdOrThrow(companyId, quoteId);

    const [deleted] = await this.db
      .update(quoteRequests)
      .set({
        deletedAt: new Date(),
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(quoteRequests.id, quoteId),
          eq(quoteRequests.companyId, companyId),
        ),
      )
      .returning()
      .execute();

    if (!deleted) throw new NotFoundException('Quote not found');

    await this.bumpCompany(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'quote_request',
        entityId: quoteId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted quote request',
        changes: {
          companyId,
          quoteId,
          storeId: existing.storeId,
          customerEmail: existing.customerEmail,
          status: existing.status,
        },
      });
    }

    return { success: true };
  }

  private async convertToManualOrderTx(
    tx: db,
    companyId: string,
    quoteId: string,
    input: {
      originInventoryLocationId: string;
      currency: string;
      channel?: 'manual' | 'pos';
      shippingAddress?: any;
      billingAddress?: any;
      customerId?: string | null;
    },
    actor?: User,
    ip?: string,
  ) {
    const [quote] = await tx
      .select()
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.companyId, companyId),
          eq(quoteRequests.id, quoteId),
          isNull(quoteRequests.deletedAt),
        ),
      )
      .for('update')
      .execute();

    if (!quote) throw new NotFoundException('Quote not found');
    if ((quote as any).convertedOrderId) {
      throw new BadRequestException('Quote already converted');
    }

    const items = await tx
      .select()
      .from(quoteRequestItems)
      .where(
        and(
          eq(quoteRequestItems.quoteRequestId, quoteId),
          isNull(quoteRequestItems.deletedAt),
        ),
      )
      .orderBy(asc(quoteRequestItems.position))
      .execute();

    if (!items.length) throw new BadRequestException('Quote has no items');

    const order = await this.manualOrdersService.createManualOrder(
      companyId,
      {
        storeId: quote.storeId,
        currency: input.currency,
        channel: input.channel ?? 'manual',
        customerId: input.customerId ?? null,
        shippingAddress: input.shippingAddress ?? null,
        billingAddress: input.billingAddress ?? null,
        originInventoryLocationId: input.originInventoryLocationId,
      },
      actor,
      ip,
      { tx },
    );

    for (const it of items) {
      if (!it.variantId) continue;

      await this.manualOrdersService.addItem(
        companyId,
        {
          orderId: order.id,
          variantId: it.variantId,
          quantity: it.quantity,
          name: it.nameSnapshot?.trim() ?? undefined,
          attributes: it.attributes ?? undefined,
        } as any,
        actor,
        ip,
        { tx },
      );
    }

    await tx
      .update(quoteRequests)
      .set({
        convertedOrderId: order.id,
        status: 'converted',
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(quoteRequests.companyId, companyId),
          eq(quoteRequests.id, quoteId),
        ),
      )
      .execute();

    return { orderId: order.id, quote };
  }

  async convertToManualOrder(
    companyId: string,
    quoteId: string,
    input: {
      originInventoryLocationId: string;
      currency: string;
      channel?: 'manual' | 'pos';
      shippingAddress?: any;
      billingAddress?: any;
      customerId?: string | null;
    },
    actor?: User,
    ip?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [quote] = await tx
        .select()
        .from(quoteRequests)
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
            isNull(quoteRequests.deletedAt),
          ),
        )
        .execute();

      if (!quote) throw new NotFoundException('Quote not found');

      if ((quote as any).convertedOrderId) {
        throw new BadRequestException('Quote already converted');
      }

      const items = await tx
        .select()
        .from(quoteRequestItems)
        .where(
          and(
            eq(quoteRequestItems.quoteRequestId, quoteId),
            isNull(quoteRequestItems.deletedAt),
          ),
        )
        .orderBy(asc(quoteRequestItems.position))
        .execute();

      if (!items.length) throw new BadRequestException('Quote has no items');

      const order = await this.manualOrdersService.createManualOrder(
        companyId,
        {
          storeId: quote.storeId,
          currency: input.currency,
          channel: input.channel ?? 'manual',
          customerId: input.customerId ?? null,
          shippingAddress: input.shippingAddress ?? null,
          billingAddress: input.billingAddress ?? null,
          originInventoryLocationId: input.originInventoryLocationId,
        },
        actor,
        ip,
        { tx },
      );

      for (const it of items) {
        if (!it.variantId) continue;

        await this.manualOrdersService.addItem(
          companyId,
          {
            orderId: order.id,
            variantId: it.variantId,
            quantity: it.quantity,
            name: it.nameSnapshot?.trim() ?? undefined,
            attributes: it.attributes ?? undefined,
          } as any,
          actor,
          ip,
          { tx },
        );
      }

      await tx
        .update(quoteRequests)
        .set({
          convertedOrderId: order.id,
          status: 'converted',
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
          ),
        )
        .execute();

      return { orderId: order.id };
    });
  }

  async sendToZoho(
    companyId: string,
    quoteId: string,
    actor?: User,
    ip?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [quote] = await tx
        .select()
        .from(quoteRequests)
        .where(
          and(
            eq(quoteRequests.companyId, companyId),
            eq(quoteRequests.id, quoteId),
            isNull(quoteRequests.deletedAt),
          ),
        )
        .for('update')
        .execute();

      if (!quote) throw new NotFoundException('Quote not found');

      let orderId = quote.convertedOrderId as string | undefined;

      if (!orderId) {
        const [location] = await tx
          .select()
          .from(inventoryLocations)
          .where(
            and(
              eq(inventoryLocations.companyId, companyId),
              eq(inventoryLocations.storeId, quote.storeId),
              eq(inventoryLocations.type, 'warehouse'),
              eq(inventoryLocations.isActive, true),
              isNull(inventoryLocations.deletedAt),
            ),
          )
          .orderBy(desc(inventoryLocations.isDefault))
          .limit(1)
          .execute();

        if (!location)
          throw new BadRequestException(
            'No warehouse inventory location found',
          );

        const currency = 'NGN';

        const res = await this.convertToManualOrderTx(
          tx,
          companyId,
          quoteId,
          {
            originInventoryLocationId: location.id,
            currency,
            channel: 'manual',
          },
          actor,
          ip,
        );

        orderId = res.orderId;
      }

      const zohoResult = await this.zohoBooks.createEstimateFromOrder(
        tx,
        companyId,
        quoteId,
        orderId!,
      );

      return { orderId, ...zohoResult };
    });
  }
}
