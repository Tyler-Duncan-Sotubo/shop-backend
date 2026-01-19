import {
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/channels/admin/common/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/channels/admin/common/guards/jwt-auth.guard';
import { User } from 'src/channels/admin/common/types/user.type';
import { PaymentReceiptService } from 'src/domains/billing/payment/services/payment-receipt.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentReceiptController {
  constructor(private readonly receipts: PaymentReceiptService) {}

  // -----------------------------
  // Admin (JWT)
  // -----------------------------

  @Get('admin/:paymentId/receipt')
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

  @Post(':paymentId/receipt/pdf')
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
}
