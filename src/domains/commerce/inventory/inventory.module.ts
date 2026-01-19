// src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/infrastructure/drizzle/drizzle.module';
import { CacheModule } from 'src/infrastructure/cache/cache.module';
import { AuditModule } from 'src/domains/audit/audit.module';
import { InventoryLocationsService } from './services/inventory-locations.service';
import { InventoryStockService } from './services/inventory-stock.service';
import { InventoryTransfersService } from './services/inventory-transfers.service';
import { InventoryLedgerService } from './services/inventory-ledger.service';
import { InventoryAvailabilityService } from './services/inventory-availability.service';

@Module({
  imports: [DrizzleModule, CacheModule, AuditModule],
  providers: [
    InventoryLocationsService,
    InventoryStockService,
    InventoryTransfersService,
    InventoryLedgerService,
    InventoryAvailabilityService,
  ],
  exports: [
    InventoryStockService,
    InventoryLocationsService,
    InventoryTransfersService,
    InventoryLedgerService,
    InventoryAvailabilityService,
  ], // for checkout / orders later
})
export class InventoryModule {}
