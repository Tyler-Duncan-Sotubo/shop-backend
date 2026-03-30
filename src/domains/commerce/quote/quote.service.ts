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
  quoteCounters,
} from 'src/infrastructure/drizzle/schema/commerce/quotes/quote-requests.schema';

import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { GetQuotesQueryDto } from './dto/get-quotes-query.dto';
import {
  inventoryItems,
  productImages,
  products,
  productVariants,
  stores,
} from 'src/infrastructure/drizzle/schema';
import { ManualOrdersService } from '../orders/manual-orders.service';
import { QuoteNotificationService } from 'src/domains/notification/services/quote-notification.service';
import { ZohoBooksService } from 'src/domains/integration/zoho/zoho-books.service';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';

@Injectable()
export class QuoteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly manualOrdersService: ManualOrdersService,
    private readonly quoteNotification: QuoteNotificationService,
    private readonly zohoBooks: ZohoBooksService,
    private readonly stock: InventoryStockService,
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
    await this.cache.bumpCompanyVersion(companyId);
  }

  private formatQuoteNumber(n: number) {
    return `QT-${String(n).padStart(6, '0')}`;
  }

  private async getNextQuoteNumberTx(tx: db, companyId: string) {
    const [existing] = await tx
      .select()
      .from(quoteCounters)
      .where(eq(quoteCounters.companyId, companyId))
      .for('update')
      .execute();

    if (!existing) {
      const nextNumber = 1;

      await tx.insert(quoteCounters).values({
        companyId,
        nextNumber: 2,
        updatedAt: new Date(),
      });

      return this.formatQuoteNumber(nextNumber);
    }

    const nextNumber = existing.nextNumber;

    await tx
      .update(quoteCounters)
      .set({
        nextNumber: nextNumber + 1,
        updatedAt: new Date(),
      })
      .where(eq(quoteCounters.companyId, companyId))
      .execute();

    return this.formatQuoteNumber(nextNumber);
  }

  // --------------------------------------------------------------------------
  // CRUD
  // --------------------------------------------------------------------------

  async create(
    companyId: string,
    dto: CreateQuoteDto,
    user?: User,
    ip?: string,
  ) {
    const {
      storeId,
      customerEmail,
      customerNote,
      meta,
      expiresAt,
      customerName,
    } = dto;
    const items = dto.items ?? [];

    if (!items.length && !meta?.isAdmin) {
      throw new BadRequestException('At least one quote item is required.');
    }

    const created = await this.db.transaction(async (tx) => {
      const quoteNumber = await this.getNextQuoteNumberTx(tx, companyId);

      const [quote] = await tx
        .insert(quoteRequests)
        .values({
          companyId,
          storeId,
          quoteNumber,
          customerEmail,
          customerNote,
          customerName,
          meta,
          expiresAt,
          status: 'new',
        })
        .returning()
        .execute();

      if (!items.length) {
        return quote;
      }

      const variantIds = Array.from(
        new Set(items.map((i) => i.variantId).filter(Boolean) as string[]),
      );

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
          const hasSalesPrice =
            v.salesPrice !== null &&
            v.salesPrice !== undefined &&
            Number(v.salesPrice) > 0;

          const unitPrice = (hasSalesPrice ? v.salesPrice : v.price) ?? null;

          return [
            v.id,
            {
              unitPrice: unitPrice === null ? null : Number(unitPrice),
              currency: v.currency ?? null,
            },
          ];
        }),
      );

      for (const it of items) {
        if (it.variantId && !variantById.has(it.variantId)) {
          throw new BadRequestException(`Variant not found: ${it.variantId}`);
        }
      }

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

    if (items.length) {
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
    }

    await this.bumpCompany(companyId);

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
          quoteNumber: (created as any).quoteNumber ?? null,
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
        storeId,
      },
      undefined,
      ip,
    );
  }

  async addItems(
    companyId: string,
    quoteId: string,
    items: {
      variantId?: string | null;
      quantity?: number;
    }[],
    user?: User,
    ip?: string,
  ) {
    if (!items?.length) {
      throw new BadRequestException('No items provided');
    }

    const updated = await this.db.transaction(async (tx) => {
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

      const normalizedItems = items
        .filter((i) => i.variantId)
        .map((i) => ({
          variantId: i.variantId as string,
          quantity: Math.max(1, Number(i.quantity ?? 1)),
        }));

      const variantIds = Array.from(
        new Set(normalizedItems.map((i) => i.variantId)),
      );

      if (!variantIds.length) {
        throw new BadRequestException(
          'At least one valid variantId is required',
        );
      }

      const variants = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          productName: products.name,
          title: productVariants.title,
          imageId: productVariants.imageId,
          price: productVariants.regularPrice,
          salesPrice: productVariants.salePrice,
          currency: productVariants.currency,
          imageUrl: productImages.url,
        })
        .from(productVariants)
        .leftJoin(products, eq(products.id, productVariants.productId))
        .leftJoin(productImages, eq(productImages.id, productVariants.imageId))
        .where(inArray(productVariants.id, variantIds))
        .execute();

      const variantById = new Map<
        string,
        {
          productId: string | null;
          productName: string | null;
          title: string | null;
          imageUrl: string | null;
          unitPrice: number | null;
          currency: string | null;
        }
      >(
        variants.map((v) => {
          const hasSalesPrice =
            v.salesPrice !== null &&
            v.salesPrice !== undefined &&
            Number(v.salesPrice) > 0;

          const unitPrice = (hasSalesPrice ? v.salesPrice : v.price) ?? null;

          return [
            v.id,
            {
              productId: v.productId ?? null,
              productName: v.productName ?? null,
              title: v.title ?? null,
              imageUrl: v.imageUrl ?? null,
              unitPrice: unitPrice === null ? null : Number(unitPrice),
              currency: v.currency ?? null,
            },
          ];
        }),
      );

      for (const it of normalizedItems) {
        if (!variantById.has(it.variantId)) {
          throw new BadRequestException(`Variant not found: ${it.variantId}`);
        }
      }

      // merge duplicate variantIds from request
      const qtyByVariantId = new Map<string, number>();
      for (const item of normalizedItems) {
        qtyByVariantId.set(
          item.variantId,
          (qtyByVariantId.get(item.variantId) ?? 0) + item.quantity,
        );
      }

      const existingRows = await tx
        .select({
          id: quoteRequestItems.id,
          variantId: quoteRequestItems.variantId,
          quantity: quoteRequestItems.quantity,
        })
        .from(quoteRequestItems)
        .where(
          and(
            eq(quoteRequestItems.quoteRequestId, quoteId),
            inArray(
              quoteRequestItems.variantId,
              Array.from(qtyByVariantId.keys()),
            ),
            isNull(quoteRequestItems.deletedAt),
          ),
        )
        .execute();

      const existingByVariantId = new Map(
        existingRows.map((row) => [row.variantId, row]),
      );

      // update existing rows
      for (const [variantId, addQty] of qtyByVariantId.entries()) {
        const existing = existingByVariantId.get(variantId);
        if (!existing) continue;

        await tx
          .update(quoteRequestItems)
          .set({
            quantity: Number(existing.quantity ?? 0) + addQty,
            updatedAt: new Date(),
          } as any)
          .where(eq(quoteRequestItems.id, existing.id))
          .execute();
      }

      // insert only new variants
      const newVariantIds = Array.from(qtyByVariantId.keys()).filter(
        (variantId) => !existingByVariantId.has(variantId),
      );

      if (newVariantIds.length) {
        const [{ maxPosition }] = await tx
          .select({
            maxPosition: sql<number>`coalesce(max(${quoteRequestItems.position}), 0)`,
          })
          .from(quoteRequestItems)
          .where(
            and(
              eq(quoteRequestItems.quoteRequestId, quoteId),
              isNull(quoteRequestItems.deletedAt),
            ),
          )
          .execute();

        await tx
          .insert(quoteRequestItems)
          .values(
            newVariantIds.map((variantId, index) => {
              const variant = variantById.get(variantId)!;

              const nameSnapshot = [variant.productName, variant.title]
                .filter(Boolean)
                .join(' - ');

              if (!nameSnapshot) {
                throw new BadRequestException(
                  `Product name/title missing for variant: ${variantId}`,
                );
              }

              return {
                companyId,
                quoteRequestId: quote.id,
                productId: variant.productId,
                variantId,
                nameSnapshot,
                variantSnapshot: variant.title ?? null,
                attributes: null,
                imageUrl: variant.imageUrl,
                quantity: qtyByVariantId.get(variantId) ?? 1,
                position: Number(maxPosition ?? 0) + index + 1,
                unitPriceMinor: variant.unitPrice,
              } as any;
            }),
          )
          .execute();
      }

      return quote;
    });

    await this.bumpCompany(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'quote_request',
        entityId: quoteId,
        userId: user.id,
        ipAddress: ip,
        details: 'Added items to quote request',
        changes: {
          companyId,
          quoteId,
          itemsCount: items.length,
        },
      });
    }

    return updated;
  }

  async updateItems(
    companyId: string,
    quoteId: string,
    items: {
      itemId: string;
      quantity: number;
    }[],
    user?: User,
    ip?: string,
  ) {
    if (!items?.length) {
      throw new BadRequestException('No items provided');
    }

    const updated = await this.db.transaction(async (tx) => {
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

      if (!quote) {
        throw new NotFoundException('Quote not found');
      }

      const itemIds = Array.from(
        new Set(items.map((i) => i.itemId).filter(Boolean)),
      );

      if (!itemIds.length) {
        throw new BadRequestException('At least one valid itemId is required');
      }

      const existingItems = await tx
        .select({
          id: quoteRequestItems.id,
        })
        .from(quoteRequestItems)
        .where(
          and(
            eq(quoteRequestItems.quoteRequestId, quoteId),
            inArray(quoteRequestItems.id, itemIds),
            isNull(quoteRequestItems.deletedAt),
          ),
        )
        .execute();

      const existingItemIds = new Set(existingItems.map((i) => i.id));

      for (const item of items) {
        if (!existingItemIds.has(item.itemId)) {
          throw new NotFoundException(`Quote item not found: ${item.itemId}`);
        }

        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new BadRequestException(
            `Invalid quantity for item: ${item.itemId}`,
          );
        }
      }

      for (const item of items) {
        await tx
          .update(quoteRequestItems)
          .set({
            quantity: Number(item.quantity),
            updatedAt: new Date(),
          } as any)
          .where(
            and(
              eq(quoteRequestItems.id, item.itemId),
              eq(quoteRequestItems.quoteRequestId, quoteId),
              isNull(quoteRequestItems.deletedAt),
            ),
          )
          .execute();
      }

      return quote;
    });

    await this.bumpCompany(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'quote_request',
        entityId: quoteId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated quote request item quantities',
        changes: {
          companyId,
          quoteId,
          itemsCount: items.length,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
      });
    }

    return updated;
  }

  async removeItems(
    companyId: string,
    quoteId: string,
    itemIds: string[],
    user?: User,
    ip?: string,
  ) {
    if (!itemIds?.length) {
      throw new BadRequestException('No itemIds provided');
    }

    const updated = await this.db.transaction(async (tx) => {
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

      if (!quote) {
        throw new NotFoundException('Quote not found');
      }

      const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean)));

      const existingItems = await tx
        .select({
          id: quoteRequestItems.id,
        })
        .from(quoteRequestItems)
        .where(
          and(
            eq(quoteRequestItems.quoteRequestId, quoteId),
            inArray(quoteRequestItems.id, uniqueItemIds),
            isNull(quoteRequestItems.deletedAt),
          ),
        )
        .execute();

      const existingItemIds = new Set(existingItems.map((i) => i.id));

      for (const itemId of uniqueItemIds) {
        if (!existingItemIds.has(itemId)) {
          throw new NotFoundException(`Quote item not found: ${itemId}`);
        }
      }

      await tx
        .delete(quoteRequestItems)
        .where(
          and(
            eq(quoteRequestItems.quoteRequestId, quoteId),
            inArray(quoteRequestItems.id, uniqueItemIds),
          ),
        )
        .execute();

      return quote;
    });

    await this.bumpCompany(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'quote_request',
        entityId: quoteId,
        userId: user.id,
        ipAddress: ip,
        details: 'Removed items from quote request',
        changes: {
          companyId,
          quoteId,
          itemIds,
          itemsCount: itemIds.length,
        },
      });
    }

    return updated;
  }

  /**
   * List quotes (store-scoped) + cached, with optional search & limit
   */
  async findAll(companyId: string, query: GetQuotesQueryDto) {
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const offset = Number(query.offset ?? 0);

    const where = and(
      eq(quoteRequests.companyId, companyId),
      eq(quoteRequests.storeId, query.storeId),
      isNull(quoteRequests.deletedAt),
      query.status ? eq(quoteRequests.status, query.status as any) : undefined,
      query.includeArchived
        ? undefined
        : ne(quoteRequests.status, 'archived' as any),
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

    if (
      dto.status &&
      dto.status !== existing.status &&
      existing.status === 'converted'
    ) {
      throw new BadRequestException('Converted quotes cannot change status');
    }

    const nextStatus = dto.status ?? existing.status;

    const [updated] = await this.db
      .update(quoteRequests)
      .set({
        status: nextStatus,
        customerEmail: dto.customerEmail ?? existing.customerEmail,
        customerName: dto.customerName ?? existing.customerName,
        customerNote:
          dto.customerNote === undefined
            ? existing.customerNote
            : dto.customerNote,
        meta: dto.meta ?? existing.meta,
        archivedAt:
          nextStatus === 'archived'
            ? (existing.archivedAt ?? new Date())
            : (existing.archivedAt ?? null),
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
        archivedAt: existing.archivedAt ?? new Date(),
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
      fulfillmentModel?: 'stock_first' | 'payment_first';
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
    if (quote.convertedOrderId) {
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

    const fulfillmentModel = input.fulfillmentModel ?? 'stock_first';
    const origin = input.originInventoryLocationId;

    // ── stock_first: pre-check ALL items before creating anything ──
    // addItem() reserves per item internally for stock_first, but we check
    // upfront to fail fast and avoid partial order creation mid-loop.
    if (fulfillmentModel === 'stock_first') {
      for (const it of items) {
        if (!it.variantId) continue;

        const [inv] = await tx
          .select({
            available: inventoryItems.available,
            reserved: inventoryItems.reserved,
            safetyStock: inventoryItems.safetyStock,
          })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.companyId, companyId),
              eq(inventoryItems.locationId, origin),
              eq(inventoryItems.productVariantId, it.variantId),
            ),
          )
          .execute();

        const sellable =
          Number(inv?.available ?? 0) -
          Number(inv?.reserved ?? 0) -
          Number(inv?.safetyStock ?? 0);

        if (sellable < Number(it.quantity)) {
          throw new BadRequestException(
            `Insufficient stock for "${it.nameSnapshot ?? it.variantId}". ` +
              `Required: ${it.quantity}, available: ${sellable}`,
          );
        }
      }
    }

    const order = await this.manualOrdersService.createManualOrder(
      companyId,
      {
        storeId: quote.storeId,
        currency: input.currency,
        channel: input.channel ?? 'manual',
        customerId: input.customerId ?? null,
        shippingAddress: input.shippingAddress ?? null,
        billingAddress: input.billingAddress ?? null,
        originInventoryLocationId: origin,
        fulfillmentModel,

        // source linkage
        quoteRequestId: quote.id,
        sourceType: 'quote',

        // copy Zoho details from quote to order
        zohoOrganizationId: quote.zohoOrganizationId ?? null,
        zohoContactId: quote.zohoContactId ?? null,
        zohoEstimateId: quote.zohoEstimateId ?? null,
        zohoEstimateNumber: quote.zohoEstimateNumber ?? null,
        zohoEstimateStatus: quote.zohoEstimateStatus ?? null,
      },
      actor,
      ip,
      { tx },
    );

    // addItem() handles stock_first reservation internally per item.
    // For payment_first it skips reservation — handled below after all items
    // are added.
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
        true,
        actor,
        ip,
        { tx },
      );
    }

    // ── payment_first: reserve whatever is available now, wait for the rest ──
    // addItem() skips reservation for payment_first so we handle it here.
    // The shortfall (quantity - toReserve) is trackable via checkStockAvailability.
    if (fulfillmentModel === 'payment_first') {
      for (const it of items) {
        if (!it.variantId) continue;

        const [inv] = await tx
          .select({
            available: inventoryItems.available,
            reserved: inventoryItems.reserved,
            safetyStock: inventoryItems.safetyStock,
          })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.companyId, companyId),
              eq(inventoryItems.locationId, origin),
              eq(inventoryItems.productVariantId, it.variantId),
            ),
          )
          .execute();

        const sellable =
          Number(inv?.available ?? 0) -
          Number(inv?.reserved ?? 0) -
          Number(inv?.safetyStock ?? 0);

        const toReserve = Math.min(Number(it.quantity), Math.max(0, sellable));

        if (toReserve > 0) {
          await this.stock.reserveForOrderInTx(
            tx,
            companyId,
            order.id,
            origin,
            it.variantId,
            toReserve,
            `Reserved stock for order ${order.orderNumber}`,
          );
        }
      }
    }

    await tx
      .update(quoteRequests)
      .set({
        convertedOrderId: order.id,
        status: 'converted',
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
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
      fulfillmentModel?: 'stock_first' | 'payment_first'; // ← add this
      channel?: 'manual' | 'pos';
      shippingAddress?: any;
      billingAddress?: any;
      customerId?: string | null;
    },
    actor?: User,
    ip?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const res = await this.convertToManualOrderTx(
        tx,
        companyId,
        quoteId,
        input,
        actor,
        ip,
      );

      await this.bumpCompany(companyId);

      return { orderId: res.orderId };
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

      if (!quote) {
        throw new NotFoundException('Quote not found');
      }

      const zohoResult = await this.zohoBooks.upsertEstimateFromQuoteTx(
        tx,
        companyId,
        quoteId,
        actor,
        ip,
      );

      await this.bumpCompany(companyId);

      return {
        action: quote.zohoEstimateId ? 'synced' : 'created',
        quoteId,
        convertedOrderId: quote.convertedOrderId ?? null,
        ...zohoResult,
      };
    });
  }
}
