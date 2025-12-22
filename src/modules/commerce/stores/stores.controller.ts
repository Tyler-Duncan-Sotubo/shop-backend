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
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { UpdateStoreDomainsDto } from './dto/update-store-domains.dto';

@Controller('stores')
export class StoresController extends BaseController {
  constructor(private readonly storesService: StoresService) {
    super();
  }

  // --------------------------------------------------------------------------
  // Company-level summary (stores + domains)
  // --------------------------------------------------------------------------

  @Get('company-all')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['stores.read'])
  getCompanyStoresSummary(@CurrentUser() user: User) {
    return this.storesService.getCompanyStoresSummary(user.companyId);
  }

  // --------------------------------------------------------------------------
  // Stores CRUD
  // --------------------------------------------------------------------------
  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['stores.read'])
  getStores(@CurrentUser() user: User) {
    return this.storesService.getStoresByCompany(user.companyId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['stores.create'])
  createStore(
    @CurrentUser() user: User,
    @Body() dto: CreateStoreDto,
    @Ip() ip: string,
  ) {
    return this.storesService.createStore(user.companyId, dto, user, ip);
  }

  @Get(':storeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['stores.read'])
  getStoreById(@CurrentUser() user: User, @Param('storeId') storeId: string) {
    return this.storesService.getStoreById(user.companyId, storeId);
  }

  @Patch(':storeId')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['stores.read'])
  getStoreDomains(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
  ) {
    return this.storesService.getStoreDomains(user.companyId, storeId);
  }

  @Patch(':storeId/domains')
  @UseGuards(JwtAuthGuard)
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
