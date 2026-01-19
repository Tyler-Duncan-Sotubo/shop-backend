import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCompanyId } from 'src/channels/storefront/common/decorators/current-company-id.decorator';
import { StorefrontGuard } from 'src/channels/storefront/common/guard/storefront.guard';
import { PaymentReceiptService } from 'src/domains/billing/payment/services/payment-receipt.service';

@Controller('payments')
@UseGuards(StorefrontGuard)
export class PaymentReceiptController {
  constructor(private readonly receipts: PaymentReceiptService) {}
  // -----------------------------
  // Storefront (API key)
  // -----------------------------
  @Get('storefront/:paymentId/receipt')
  async getReceiptStorefront(
    @CurrentCompanyId() companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const data = await this.receipts.getReceiptViewModel(companyId, paymentId);
    return { data };
  }

  @Post('storefront/:paymentId/receipt/pdf')
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
