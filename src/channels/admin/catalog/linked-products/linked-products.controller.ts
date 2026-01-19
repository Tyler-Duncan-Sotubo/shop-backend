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
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { ProductLinkType } from 'src/infrastructure/drizzle/schema';
import { IsArray, IsString } from 'class-validator';
import { LinkedProductsService } from 'src/domains/catalog/services/linked-products.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class SetLinkedProductsDto {
  @IsArray()
  @IsString({ each: true })
  linkedProductIds: string[];
}

@Controller('linked-products')
@UseGuards(JwtAuthGuard)
export class LinkedProductsController extends BaseController {
  constructor(private readonly linkedProductsService: LinkedProductsService) {
    super();
  }

  // ----------------- Get linked products -----------------
  @Get('products/:productId')
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

  // ----------------- Replace linked products for a type -----------------
  @Put('products/:productId/:linkType')
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
  @Delete('products/:productId/:linkId')
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
