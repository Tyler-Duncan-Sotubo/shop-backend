import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateStoreDomainsDto } from './dto/update-store-domains.dto';
import { StoresService } from 'src/domains/commerce/stores/stores.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserStoreAccessService } from 'src/domains/auth/services/user-store-access.service';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController extends BaseController {
  constructor(
    private readonly storesService: StoresService,
    private readonly userStoreAccess: UserStoreAccessService,
  ) {
    super();
  }

  // --------------------------------------------------------------------------
  // Company-level summary (stores + domains)
  // --------------------------------------------------------------------------

  @Get('company-all')
  @SetMetadata('permissions', ['stores.read'])
  getCompanyStoresSummary(@CurrentUser() user: User) {
    return this.storesService.getCompanyStoresSummary(user.companyId);
  }

  // --------------------------------------------------------------------------
  // Accessible stores (scoped to user) — must be before :storeId
  // --------------------------------------------------------------------------

  @Get('accessible-stores')
  @SetMetadata('permissions', ['stores.read'])
  getAccessibleStores(@CurrentUser() user: User) {
    return this.userStoreAccess.getStoresForUser(user.id);
  }

  @Get('users/:userId/stores')
  @SetMetadata('permissions', ['users.read'])
  getUserStores(@Param('userId') userId: string) {
    return this.userStoreAccess.getStoresForUser(userId);
  }

  // --------------------------------------------------------------------------
  // Stores CRUD
  // --------------------------------------------------------------------------

  @Get()
  @SetMetadata('permissions', ['stores.read'])
  getStores(@CurrentUser() user: User) {
    return this.storesService.getStoresByCompany(user.companyId);
  }

  @Post()
  @SetMetadata('permissions', ['stores.create'])
  createStore(
    @CurrentUser() user: User,
    @Body() dto: CreateStoreDto,
    @Ip() ip: string,
  ) {
    return this.storesService.createStore(user.companyId, dto, user, ip);
  }

  @Get(':storeId')
  @SetMetadata('permissions', ['stores.read'])
  getStoreById(@CurrentUser() user: User, @Param('storeId') storeId: string) {
    return this.storesService.getStoreById(user.companyId, storeId);
  }

  @Patch(':storeId')
  @SetMetadata('permissions', ['stores.update'])
  updateStore(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateStoreDto,
    @Ip() ip: string,
  ) {
    return this.storesService.updateStore(
      user.companyId,
      storeId,
      dto,
      user,
      ip,
    );
  }

  @Delete(':storeId')
  @SetMetadata('permissions', ['stores.delete'])
  deleteStore(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Ip() ip: string,
  ) {
    return this.storesService.deleteStore(user.companyId, storeId, user, ip);
  }

  // --------------------------------------------------------------------------
  // Store Domains
  // --------------------------------------------------------------------------

  @Get(':storeId/domains')
  @SetMetadata('permissions', ['stores.read'])
  getStoreDomains(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.storesService.getStoreDomains(user.companyId, storeId);
  }

  @Patch(':storeId/domains')
  @SetMetadata('permissions', ['stores.manage_domains'])
  updateStoreDomains(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateStoreDomainsDto,
    @Ip() ip: string,
  ) {
    return this.storesService.updateStoreDomains(
      user.companyId,
      storeId,
      dto.domains,
      user,
      ip,
    );
  }
}
