import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Put,
  Delete,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { LinkedProductsService } from '../services/linked-products.service';
import { ProductLinkType } from 'src/drizzle/schema';
import { IsArray, IsString } from 'class-validator';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';

class SetLinkedProductsDto {
  @IsArray()
  @IsString({ each: true })
  linkedProductIds: string[];
}

@Controller('catalog')
export class LinkedProductsController extends BaseController {
  constructor(private readonly linkedProductsService: LinkedProductsService) {
    super();
  }

  // ----------------- Get linked products -----------------
  @Get('products/:productId/links')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async getLinkedProducts(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Query('linkType') linkType?: ProductLinkType,
  ) {
    return this.linkedProductsService.getLinkedProducts(
      user.companyId,
      productId,
      linkType,
    );
  }

  // ----------------- Storefront -----------------
  @Get('links/storefront/:productId')
  @UseGuards(StorefrontGuard)
  async GetStoreFrontLinkedProducts(
    @CurrentCompanyId() companyId: string,
    @Param('productId') productId: string,
    @Query('linkType') linkType?: ProductLinkType,
  ) {
    return this.linkedProductsService.getLinkedProducts(
      companyId,
      productId,
      linkType,
    );
  }

  // ----------------- Replace linked products for a type -----------------
  @Put('products/:productId/links/:linkType')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async setLinkedProducts(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Param('linkType') linkType: ProductLinkType,
    @Body() dto: SetLinkedProductsDto,
    @Ip() ip: string,
  ) {
    const inserted = await this.linkedProductsService.setLinkedProducts(
      user.companyId,
      productId,
      linkType,
      dto.linkedProductIds,
      user,
      ip,
    );

    return inserted;
  }

  // ----------------- Remove a single link -----------------
  @Delete('products/:productId/links/:linkId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async removeLink(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Param('linkId') linkId: string,
    @Ip() ip: string,
  ) {
    return this.linkedProductsService.removeLink(
      user.companyId,
      productId,
      linkId,
      user,
      ip,
    );
  }
}
