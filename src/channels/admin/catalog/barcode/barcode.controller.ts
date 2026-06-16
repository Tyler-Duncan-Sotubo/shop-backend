import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  SetMetadata,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { User } from 'src/channels/admin/common/types/user.type';
import {
  BarcodeService,
  BarcodeFormat,
} from 'src/domains/catalog/services/barcode.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';

@Controller('catalog/barcodes')
@UseGuards(JwtAuthGuard)
@SetMetadata('permissions', ['products.update'])
export class BarcodeController extends BaseController {
  constructor(private readonly barcodes: BarcodeService) {
    super();
  }

  // POST /api/catalog/barcodes/variants/:variantId/generate
  @Post('variants/:variantId/generate')
  async generateForVariant(
    @CurrentUser() user: User,
    @Param('variantId') variantId: string,
    @Body('format') format?: BarcodeFormat,
  ) {
    return this.barcodes.generateForVariant(
      user.companyId,
      variantId,
      format ?? 'code128',
    );
  }

  // Lookup variant by barcode/SKU (used by mobile scanner)
  // GET /api/catalog/barcodes/lookup?value=MC-ABC123&storeId=xxx
  @Get('lookup')
  @SetMetadata('permissions', ['products.read'])
  async lookup(
    @CurrentUser() user: User,
    @Query('value') value: string,
    @Query('storeId') storeId: string,
  ) {
    return this.barcodes.lookupByBarcode(user.companyId, storeId, value);
  }

  @Get('lookup/pos')
  async lookupByBarcodeForPOS(
    @CurrentUser() user: User,
    @Query('value') value: string,
    @Query('storeId') storeId: string,
    @Query('locationId') locationId: string,
  ) {
    if (!value) throw new BadRequestException('value is required');
    if (!storeId) throw new BadRequestException('storeId is required');
    if (!locationId) throw new BadRequestException('locationId is required');

    return this.barcodes.lookupByBarcodeForPOS(
      user.companyId,
      storeId,
      locationId,
      value,
    );
  }

  // Generate PDF label sheet for multiple variants
  // POST /api/catalog/barcodes/labels/pdf
  @Post('labels/pdf')
  async generateLabelsPdf(
    @CurrentUser() user: User,
    @Body('variantIds') variantIds: string[],
    @Body('format') format?: BarcodeFormat,
  ) {
    return this.barcodes.generateLabelsPdf(
      user.companyId,
      variantIds,
      format ?? 'code128',
    );
  }

  // Bulk generate for all variants of a product
  // POST /api/catalog/barcodes/products/:productId/generate-all
  @Post('products/:productId/generate-all')
  async bulkGenerateForProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Body('format') format?: BarcodeFormat,
  ) {
    return this.barcodes.bulkGenerateForProduct(
      user.companyId,
      productId,
      format ?? 'code128',
    );
  }

  // Bulk generate for all active variants in a store
  // POST /api/catalog/barcodes/stores/:storeId/generate-all
  @Post('stores/:storeId/generate-all')
  async bulkGenerateForStore(
    @CurrentUser() user: User,
    @Param('storeId') storeId: string,
    @Body('format') format?: BarcodeFormat,
    @Body('skipExisting') skipExisting?: boolean,
  ) {
    return this.barcodes.bulkGenerateForStore(
      user.companyId,
      storeId,
      format ?? 'code128',
      { skipExisting: skipExisting ?? true },
    );
  }
}
