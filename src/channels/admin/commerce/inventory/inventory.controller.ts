// src/modules/inventory/inventory.controller.ts
import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  SetMetadata,
  UseGuards,
  Query,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import {
  AdjustInventoryLevelDto,
  CreateLocationDto,
  CreateTransferDto,
  SetInventoryLevelDto,
  UpdateLocationDto,
  UpdateStoreLocationsDto,
  UpdateTransferStatusDto,
} from './dto';
import { InventoryLocationsService } from 'src/domains/commerce/inventory/services/inventory-locations.service';
import { InventoryStockService } from 'src/domains/commerce/inventory/services/inventory-stock.service';
import { InventoryTransfersService } from 'src/domains/commerce/inventory/services/inventory-transfers.service';
import { InventoryLedgerService } from 'src/domains/commerce/inventory/services/inventory-ledger.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ListInventoryMovementsDto } from './dto/list-invertory-movements.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController extends BaseController {
  constructor(
    private readonly locationsService: InventoryLocationsService,
    private readonly stockService: InventoryStockService,
    private readonly transfersService: InventoryTransfersService,
    private readonly svc: InventoryLedgerService,
  ) {
    super();
  }

  // ----------------- Locations -----------------
  @Get('locations')
  @SetMetadata('permissions', ['locations.read'])
  getLocations(@CurrentUser() user: User, @Query('storeId') storeId: string) {
    return this.locationsService.getLocationsForStore(user.companyId, storeId);
  }

  @Post('locations')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.create'])
  createLocation(
    @CurrentUser() user: User,
    @Body() dto: CreateLocationDto,
    @Ip() ip: string,
  ) {
    return this.locationsService.createLocation(user.companyId, dto, user, ip);
  }

  @Patch('locations/:locationId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.update'])
  updateLocation(
    @CurrentUser() user: User,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationDto,
    @Ip() ip: string,
  ) {
    return this.locationsService.updateLocation(
      user.companyId,
      locationId,
      dto,
      user,
      ip,
    );
  }

  @Delete('locations/:locationId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.delete'])
  deleteLocation(
    @CurrentUser() user: User,
    @Param('locationId') locationId: string,
    @Ip() ip: string,
  ) {
    console.log(
      `Deleting location ${locationId} for company ${user.companyId}`,
    );
    return this.locationsService.deleteLocation(
      user.companyId,
      locationId,
      user,
      ip,
    );
  }

  // ----------------- Store ↔ Locations -----------------
  @Get('stores/:storeId/locations/options')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.read'])
  getStoreLocationOptions(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.locationsService.getStoreLocationOptions(
      user.companyId,
      storeId,
    );
  }

  @Get('stores/:storeId/locations')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.read'])
  async getStoreLocations(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    const locations = await this.locationsService.getStoreLocations(
      user.companyId,
      storeId,
    );

    return locations;
  }

  @Patch('stores/:storeId/locations')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.locations.assign'])
  updateStoreLocations(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateStoreLocationsDto,
    @Ip() ip: string,
  ) {
    return this.locationsService.updateStoreLocations(
      user.companyId,
      storeId,
      dto,
      user,
      ip,
    );
  }

  // ----------------- Inventory Items (stock) -----------------
  @Patch('items/level')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.items.update', 'inventory.adjust'])
  setInventoryLevel(
    @CurrentUser() user: User,
    @Body() dto: SetInventoryLevelDto,
    @Ip() ip: string,
  ) {
    return this.stockService.setInventoryLevel(
      user.companyId,
      dto.productVariantId,
      dto.quantity,
      dto.safetyStock,
      user,
      ip,
    );
  }

  @Patch('items/adjust')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.items.update', 'inventory.adjust'])
  adjustInventoryLevel(
    @CurrentUser() user: User,
    @Body() dto: AdjustInventoryLevelDto,
    @Ip() ip: string,
  ) {
    return this.stockService.adjustInventoryLevel(
      user.companyId,
      dto.productVariantId,
      dto.locationId,
      dto.delta,
      user,
      ip,
    );
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.read'])
  async getInventoryOverview(
    @CurrentUser() user: User,
    @Query('locationId') locationId?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'draft' | 'archived',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('storeId') storeId?: string,
  ) {
    const stock = await this.stockService.getInventoryOverview(user.companyId, {
      locationId,
      search,
      status,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      storeId,
    });
    return stock;
  }

  // ----------------- Transfers -----------------
  @Get('transfers/store/:storeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.transfers.read'])
  listTransfers(@CurrentUser() user: User, @Param('storeId') storeId: string) {
    return this.transfersService.listTransfers(user.companyId, storeId);
  }

  @Get('transfers/:transferId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.transfers.read'])
  getTransfer(
    @CurrentUser() user: User,
    @Param('transferId') transferId: string,
  ) {
    return this.transfersService.getTransferById(user.companyId, transferId);
  }

  @Post('transfers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.transfers.create'])
  createTransfer(
    @CurrentUser() user: User,
    @Body() dto: CreateTransferDto,
    @Ip() ip: string,
  ) {
    return this.transfersService.createTransfer(user.companyId, dto, user, ip);
  }

  @Patch('transfers/:transferId/status')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.transfers.update'])
  updateTransferStatus(
    @CurrentUser() user: User,
    @Param('transferId') transferId: string,
    @Body() dto: UpdateTransferStatusDto,
    @Ip() ip: string,
  ) {
    return this.transfersService.updateTransferStatus(
      user.companyId,
      transferId,
      dto,
      user,
      ip,
    );
  }

  @Get('stores/:storeId/transfers/history')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.transfers.read'])
  getStoreTransferHistory(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.transfersService.getStoreTransferHistory(
      user.companyId,
      storeId,
    );
  }

  /// -----------------Stock Movements -----------------
  @Get('movements')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['inventory.transfers.read'])
  list(@CurrentUser() user: User, @Query() q: ListInventoryMovementsDto) {
    return this.svc.list(user.companyId, q);
  }
}
