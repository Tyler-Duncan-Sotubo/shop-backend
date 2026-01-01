import {
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { PaymentReceiptService } from './payment-receipt.service';

import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from 'src/modules/iam/api-keys/guard/api-key.guard';

import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

import { ApiScopes } from 'src/modules/iam/api-keys/decorators/api-scopes.decorator';
import { CurrentCompanyId } from 'src/modules/iam/api-keys/decorators/current-company-id.decorator';

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
    const data = await this.receipts.generateReceiptPdfUrl(
      user.companyId,
      paymentId,
    );
    return { data };
  }

  // -----------------------------
  // Storefront (API key)
  // -----------------------------

  @Get('storefront/:paymentId/receipt')
  @UseGuards(ApiKeyGuard)
  @ApiScopes('billing.payments.read') // choose your naming; see note below
  async getReceiptStorefront(
    @CurrentCompanyId() companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const data = await this.receipts.getReceiptViewModel(companyId, paymentId);
    return { data };
  }

  @Post('storefront/:paymentId/receipt/pdf')
  @UseGuards(ApiKeyGuard)
  @ApiScopes('billing.payments.read') // or billing.payments.print
  async generateReceiptPdfStorefront(
    @CurrentCompanyId() companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const data = await this.receipts.generateReceiptPdfUrl(
      companyId,
      paymentId,
    );
    return { data };
  }
}
