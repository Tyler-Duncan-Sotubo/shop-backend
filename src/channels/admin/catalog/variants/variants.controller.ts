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
import { User } from 'src/channels/admin/common/types/user.type';
import { VariantsService } from 'src/domains/catalog/services/variants.service';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateVariantDto, UpdateVariantDto, VariantQueryDto } from './dto';
import {
  mapVariantToResponse,
  mapVariantToResponseWithImage,
} from 'src/domains/catalog/mappers/variant.mapper';
import { StoreVariantQueryDto } from './dto/store-vairants.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class VariantsController extends BaseController {
  constructor(private readonly variantsService: VariantsService) {
    super();
  }

  // ----------------- List Variants for a Product -----------------
  @Get('products/:productId/variants')
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
