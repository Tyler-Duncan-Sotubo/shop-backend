import {
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { PaymentReceiptService } from '../services/payment-receipt.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';

@Controller('payments')
export class PaymentReceiptController {
  constructor(private readonly receipts: PaymentReceiptService) {}

  // -----------------------------
  // Admin (JWT)
  // -----------------------------

  @Get('admin/:paymentId/receipt')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['payments.read'])
  async getReceiptAdmin(
    @CurrentUser() user: User,
    @Param('paymentId') paymentId: string,
  ) {
    const data = await this.receipts.getReceiptViewModel(
      user.companyId,
      paymentId,
    );
    return { data };
  }

  @Post('admin/:paymentId/receipt/pdf')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['payments.read'])
  async generateReceiptPdfAdmin(
    @CurrentUser() user: User,
    @Param('paymentId') paymentId: string,
  ) {
    // 1) generate pdf (slow path)
    const generated = await this.receipts.generateReceiptPdfUrl(
      user.companyId,
      paymentId,
    );

    // 2) persist url + storageKey on payment_receipts
    // (idempotent update, safe to call many times)
    await this.receipts.attachPdfToReceiptByPaymentId(
      user.companyId,
      paymentId,
      generated.pdfUrl,
      generated.storageKey,
    );

    return { data: generated };
  }

  // -----------------------------
  // Storefront (API key)
  // -----------------------------

  @Get('storefront/:paymentId/receipt')
  @UseGuards(StorefrontGuard)
  async getReceiptStorefront(
    @CurrentCompanyId() companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const data = await this.receipts.getReceiptViewModel(companyId, paymentId);
    return { data };
  }

  @Post('storefront/:paymentId/receipt/pdf')
  @UseGuards(StorefrontGuard)
  async generateReceiptPdfStorefront(
    @CurrentCompanyId() companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const generated = await this.receipts.generateReceiptPdfUrl(
      companyId,
      paymentId,
    );

    await this.receipts.attachPdfToReceiptByPaymentId(
      companyId,
      paymentId,
      generated.pdfUrl,
      generated.storageKey,
    );

    return { data: generated };
  }
}
