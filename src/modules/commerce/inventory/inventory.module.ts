// src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';
import { AuditModule } from 'src/modules/audit/audit.module';
import { InventoryController } from './inventory.controller';
import { InventoryLocationsService } from './services/inventory-locations.service';
import { InventoryStockService } from './services/inventory-stock.service';
import { InventoryTransfersService } from './services/inventory-transfers.service';
import { InventoryLedgerService } from './services/inventory-ledger.service';

@Module({
  imports: [DrizzleModule, CacheModule, AuditModule],
  controllers: [InventoryController],
  providers: [
    InventoryLocationsService,
    InventoryStockService,
    InventoryTransfersService,
    InventoryLedgerService,
  ],
  exports: [
    InventoryStockService,
    InventoryLocationsService,
    InventoryTransfersService,
    InventoryLedgerService,
  ], // for checkout / orders later
})
export class InventoryModule {}
