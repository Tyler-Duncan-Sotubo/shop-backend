// src/modules/catalog/controllers/variants.controller.ts
import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

import { VariantsService } from '../services/variants.service';
import {
  CreateVariantDto,
  UpdateVariantDto,
  VariantQueryDto,
} from '../dtos/variants';
import {
  mapVariantToResponse,
  mapVariantToResponseWithImage,
} from '../mappers/variant.mapper';
import { StoreVariantQueryDto } from '../dtos/variants/store-vairants.dto';

@Controller('catalog')
export class VariantsController extends BaseController {
  constructor(private readonly variantsService: VariantsService) {
    super();
  }

  // ----------------- List Variants for a Product -----------------
  @Get('products/:productId/variants')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async listVariantsForProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Query() query: VariantQueryDto,
  ) {
    const variants = await this.variantsService.listVariants(user.companyId, {
      ...query,
      productId,
    });

    return variants.map((r) =>
      mapVariantToResponseWithImage(
        r.variant,
        r.image ?? null,
        r.inventory ?? null,
      ),
    );
  }

  @Get('/products/variants/store')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async listForStore(
    @CurrentUser() user: User,
    @Query() query: StoreVariantQueryDto,
  ) {
    const data = await this.variantsService.listStoreVariantsForCombobox(
      user.companyId,
      query,
    );
    return data;
  }

  // ----------------- Get Single Variant by ID -----------------
  @Get('variants/:variantId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async getVariant(
    @CurrentUser() user: User,
    @Param('variantId') variantId: string,
  ) {
    const variant = await this.variantsService.getVariantById(
      user.companyId,
      variantId,
    );
    return mapVariantToResponse(variant);
  }

  // ----------------- Create Variant for a Product -----------------
  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async createVariant(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
    @Ip() ip: string,
  ) {
    const variant = await this.variantsService.createVariant(
      user.companyId,
      productId,
      dto,
      user,
      ip,
    );
    return mapVariantToResponse(variant);
  }

  // ----------------- Generate Variants from Options -----------------
  @Post('products/:productId/variants/generate')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async generateVariantsForProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Ip() ip: string,
  ) {
    const inserted = await this.variantsService.generateVariantsForProduct(
      user.companyId,
      productId,
      user,
      ip,
    );
    return inserted.map(mapVariantToResponse);
  }

  // ----------------- Update Variant -----------------
  @Patch('variants/:variantId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async updateVariant(
    @CurrentUser() user: User,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @Ip() ip: string,
  ) {
    const variant = await this.variantsService.updateVariant(
      user.companyId,
      variantId,
      dto,
      user,
      ip,
    );
    return mapVariantToResponse(variant);
  }

  // ----------------- Delete Variant (soft delete) -----------------
  @Delete('variants/:variantId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async deleteVariant(
    @CurrentUser() user: User,
    @Param('variantId') variantId: string,
    @Ip() ip: string,
  ) {
    return this.variantsService.deleteVariant(
      user.companyId,
      variantId,
      user,
      ip,
    );
  }
}
