// src/modules/inventory/inventory-transfers.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, or, desc } from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  inventoryTransfers,
  inventoryTransferItems,
  inventoryLocations,
  products,
  productVariants,
  auditLogs,
  users,
  inventoryItems,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateTransferDto, UpdateTransferStatusDto } from '../dto';
import { InventoryLocationsService } from './inventory-locations.service';
import { InventoryStockService } from './inventory-stock.service';

type QtyLine = { productVariantId: string; quantity: number };

@Injectable()
export class InventoryTransfersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly locationsService: InventoryLocationsService,
    private readonly stockService: InventoryStockService,
  ) {}

  private computeSellable(row: any) {
    const available = Number(row?.available ?? 0);
    const reserved = Number(row?.reserved ?? 0);
    const safety = Number(row?.safetyStock ?? 0);
    return available - reserved - safety;
  }

  private normalizeTransferItems(items: QtyLine[]): QtyLine[] {
    const map = new Map<string, number>();
    for (const it of items ?? []) {
      const qty = Number(it.quantity ?? 0);
      if (!it.productVariantId) continue;
      if (!Number.isFinite(qty) || qty <= 0) continue;

      map.set(it.productVariantId, (map.get(it.productVariantId) ?? 0) + qty);
    }
    return Array.from(map.entries()).map(([productVariantId, quantity]) => ({
      productVariantId,
      quantity,
    }));
  }

  private async assertEnoughStockForTransfer(
    companyId: string,
    fromLocationId: string,
    items: QtyLine[],
  ) {
    const normalized = this.normalizeTransferItems(items);

    if (!normalized.length) {
      throw new BadRequestException('Transfer must have at least one item');
    }

    const variantIds = normalized.map((i) => i.productVariantId);

    const rows = await this.db
      .select({
        productVariantId: inventoryItems.productVariantId,
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        safetyStock: inventoryItems.safetyStock,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.locationId, fromLocationId),
          inArray(inventoryItems.productVariantId, variantIds),
        ),
      )
      .execute();

    const byVariant = new Map(rows.map((r) => [r.productVariantId, r]));

    const errors: Array<{
      productVariantId: string;
      requested: number;
      sellable: number;
    }> = [];

    for (const line of normalized) {
      const row = byVariant.get(line.productVariantId);
      const sellable = this.computeSellable(row);
      if (sellable < line.quantity) {
        errors.push({
          productVariantId: line.productVariantId,
          requested: line.quantity,
          sellable,
        });
      }
    }

    if (errors.length) {
      // Keep message readable for UI
      throw new BadRequestException({
        message: 'Insufficient stock to create transfer',
        errors,
      });
    }

    return normalized;
  }

  async createTransfer(
    companyId: string,
    dto: CreateTransferDto,
    user?: User,
    ip?: string,
  ) {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException(
        'fromLocationId and toLocationId must differ',
      );
    }

    // ✅ validate BEFORE creating transfer
    const normalizedItems = await this.assertEnoughStockForTransfer(
      companyId,
      dto.fromLocationId,
      dto.items ?? [],
    );

    const result = await this.db.transaction(async (tx) => {
      const [transfer] = await tx
        .insert(inventoryTransfers)
        .values({
          companyId,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          reference: dto.reference,
          notes: dto.notes,
          status: 'pending',
        })
        .returning()
        .execute();

      await tx
        .insert(inventoryTransferItems)
        .values(
          normalizedItems.map((item) => ({
            companyId,
            transferId: transfer.id,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          })),
        )
        .execute();

      const items = await tx.query.inventoryTransferItems.findMany({
        where: eq(inventoryTransferItems.transferId, transfer.id),
      });

      return { ...transfer, items };
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'inventory_transfer',
        entityId: result.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created inventory transfer',
        changes: {
          companyId,
          transferId: result.id,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          items: dto.items,
        },
      });
    }

    return result;
  }

  async listTransfers(companyId: string, storeId?: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['inventory', 'transfers', 'v4', storeId ?? 'all'],
      async () => {
        let allowedLocationIds: string[] | null = null;

        if (storeId) {
          const locs = await this.db
            .select({ id: inventoryLocations.id })
            .from(inventoryLocations)
            .where(
              and(
                eq(inventoryLocations.companyId, companyId),
                eq(inventoryLocations.storeId, storeId),
                eq(inventoryLocations.isActive, true),
              ),
            )
            .execute();

          const ids = locs.map((l) => l.id);
          if (ids.length === 0) return [];
          allowedLocationIds = ids;
        }

        const transfers = await this.db
          .select()
          .from(inventoryTransfers)
          .where(
            and(
              eq(inventoryTransfers.companyId, companyId),
              ...(allowedLocationIds
                ? [
                    or(
                      inArray(
                        inventoryTransfers.fromLocationId,
                        allowedLocationIds,
                      ),
                      inArray(
                        inventoryTransfers.toLocationId,
                        allowedLocationIds,
                      ),
                    ),
                  ]
                : []),
            ),
          )
          .execute();

        if (transfers.length === 0) return [];

        const transferIds = transfers.map((t) => t.id);

        const items = await this.db
          .select({
            id: inventoryTransferItems.id,
            transferId: inventoryTransferItems.transferId,
            productVariantId: inventoryTransferItems.productVariantId,
            quantity: inventoryTransferItems.quantity,
            productName: products.name,
            variantTitle: productVariants.title,
            sku: productVariants.sku,
          })
          .from(inventoryTransferItems)
          .leftJoin(
            productVariants,
            and(
              eq(productVariants.id, inventoryTransferItems.productVariantId),
              eq(productVariants.companyId, companyId),
            ),
          )
          .leftJoin(
            products,
            and(
              eq(products.id, productVariants.productId),
              eq(products.companyId, companyId),
            ),
          )
          .where(inArray(inventoryTransferItems.transferId, transferIds))
          .execute();

        const locationIds = Array.from(
          new Set(transfers.flatMap((t) => [t.fromLocationId, t.toLocationId])),
        );

        const locRows = await this.db
          .select({ id: inventoryLocations.id, name: inventoryLocations.name })
          .from(inventoryLocations)
          .where(
            and(
              eq(inventoryLocations.companyId, companyId),
              inArray(inventoryLocations.id, locationIds),
            ),
          )
          .execute();

        const locNameById = new Map(locRows.map((l) => [l.id, l.name]));

        const itemsByTransferId = new Map<string, typeof items>();
        for (const it of items) {
          const arr = itemsByTransferId.get(it.transferId) ?? [];
          arr.push(it);
          itemsByTransferId.set(it.transferId, arr);
        }

        return transfers.map((t) => {
          const its = itemsByTransferId.get(t.id) ?? [];
          const totalQty = its.reduce(
            (sum, x) => sum + Number(x.quantity ?? 0),
            0,
          );

          return {
            ...t,
            fromLocationName: locNameById.get(t.fromLocationId) ?? null,
            toLocationName: locNameById.get(t.toLocationId) ?? null,
            items: its.map((it) => ({
              id: it.id,
              productVariantId: it.productVariantId,
              quantity: it.quantity,
              productName: it.productName ?? null,
              variantTitle: it.variantTitle ?? null,
              sku: it.sku ?? null,
            })),
            itemsCount: its.length,
            totalQuantity: totalQty,
          };
        });
      },
    );
  }

  async getTransferById(companyId: string, transferId: string) {
    const transfer = await this.db.query.inventoryTransfers.findFirst({
      where: and(
        eq(inventoryTransfers.companyId, companyId),
        eq(inventoryTransfers.id, transferId),
      ),
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    const items = await this.db.query.inventoryTransferItems.findMany({
      where: eq(inventoryTransferItems.transferId, transfer.id),
    });

    return { ...transfer, items };
  }

  async updateTransferStatus(
    companyId: string,
    transferId: string,
    dto: UpdateTransferStatusDto,
    user?: User,
    ip?: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const existing = await tx.query.inventoryTransfers.findFirst({
        where: and(
          eq(inventoryTransfers.companyId, companyId),
          eq(inventoryTransfers.id, transferId),
        ),
      });

      if (!existing) {
        throw new NotFoundException('Transfer not found');
      }

      const [updated] = await tx
        .update(inventoryTransfers)
        .set({
          status: dto.status,
          notes: dto.notes ?? existing.notes,
        })
        .where(
          and(
            eq(inventoryTransfers.companyId, companyId),
            eq(inventoryTransfers.id, transferId),
          ),
        )
        .returning()
        .execute();

      const isNowCompleted = dto.status === 'completed';
      const wasCompleted = existing.status === 'completed';

      // Only move stock the first time we reach "completed"
      if (isNowCompleted && !wasCompleted) {
        const items = await tx.query.inventoryTransferItems.findMany({
          where: eq(inventoryTransferItems.transferId, transferId),
        });

        for (const item of items) {
          // decrement from-location
          await this.stockService.adjustInventoryInTx(
            tx,
            companyId,
            item.productVariantId,
            existing.fromLocationId,
            -item.quantity,
          );

          // increment to-location
          await this.stockService.adjustInventoryInTx(
            tx,
            companyId,
            item.productVariantId,
            existing.toLocationId,
            item.quantity,
          );
        }
      }

      return { existing, updated };
    });

    const { existing, updated } = result;

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'inventory_transfer',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated inventory transfer status',
        changes: {
          companyId,
          transferId: updated.id,
          beforeStatus: existing.status,
          afterStatus: updated.status,
        },
      });
    }

    return updated;
  }

  async getStoreTransferHistory(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['inventory', 'stores', storeId, 'transfers', 'history', 'v2'],
      async () => {
        // 1) Store location ids (no store_locations table anymore)
        const locs = await this.db
          .select({ id: inventoryLocations.id })
          .from(inventoryLocations)
          .where(
            and(
              eq(inventoryLocations.companyId, companyId),
              eq(inventoryLocations.storeId, storeId),
              eq(inventoryLocations.isActive, true),
            ),
          )
          .execute();

        const storeLocationIds = locs.map((l) => l.id);
        if (storeLocationIds.length === 0) return [];

        // 2) Transfers touching this store (from OR to)
        const transfers = await this.db
          .select({
            id: inventoryTransfers.id,
            fromLocationId: inventoryTransfers.fromLocationId,
            toLocationId: inventoryTransfers.toLocationId,
          })
          .from(inventoryTransfers)
          .where(
            and(
              eq(inventoryTransfers.companyId, companyId),
              or(
                inArray(inventoryTransfers.fromLocationId, storeLocationIds),
                inArray(inventoryTransfers.toLocationId, storeLocationIds),
              ),
            ),
          )
          .execute();

        if (transfers.length === 0) return [];

        const transferIds = transfers.map((t) => t.id);
        const transferById = new Map(transfers.map((t) => [t.id, t]));

        // 3) Location names for those transfers
        const allLocationIds = Array.from(
          new Set(transfers.flatMap((t) => [t.fromLocationId, t.toLocationId])),
        );

        const locRows = await this.db
          .select({
            id: inventoryLocations.id,
            name: inventoryLocations.name,
          })
          .from(inventoryLocations)
          .where(
            and(
              eq(inventoryLocations.companyId, companyId),
              inArray(inventoryLocations.id, allLocationIds),
            ),
          )
          .execute();

        const locNameById = new Map(locRows.map((l) => [l.id, l.name]));

        // 4) Audit logs + user names (join)
        // ✅ add companyId filter
        const logs = await this.db
          .select({
            id: auditLogs.id,
            timestamp: auditLogs.timestamp,
            transferId: auditLogs.entityId,
            changes: auditLogs.changes,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(auditLogs)
          .leftJoin(users, eq(users.id, auditLogs.userId))
          .where(
            and(
              eq(auditLogs.entity, 'inventory_transfer'),
              inArray(auditLogs.entityId, transferIds),
            ),
          )
          .orderBy(desc(auditLogs.timestamp))
          .execute();

        // 5) Return simplified shape
        return logs.map((l) => {
          const t = l.transferId ? transferById.get(l.transferId) : undefined;

          return {
            id: l.id,
            timestamp: l.timestamp,
            by: {
              firstName: l.firstName ?? null,
              lastName: l.lastName ?? null,
            },
            transferId: l.transferId ?? null,
            fromLocationName: t
              ? (locNameById.get(t.fromLocationId) ?? null)
              : null,
            toLocationName: t
              ? (locNameById.get(t.toLocationId) ?? null)
              : null,
            changes: l.changes ?? null,
          };
        });
      },
    );
  }
}
