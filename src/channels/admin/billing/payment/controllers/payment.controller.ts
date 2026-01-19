// src/modules/billing/payments/controllers/payments.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PaystackSuccessDto } from '../dto/paystack-success.dto';
import { ListPaymentsQueryDto } from '../dto/payment-list.dto';
import { FinalizeBankTransferPaymentDto } from '../dto/finalize-bank-transfer.dto';
import { PaymentService } from 'src/domains/billing/payment/services/payment.service';
import { PaymentReceiptService } from 'src/domains/billing/payment/services/payment-receipt.service';
import { JwtAuthGuard } from 'src/channels/admin/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/channels/admin/common/decorator/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController extends BaseController {
  constructor(
    private readonly paymentsService: PaymentService,
    private readonly receipts: PaymentReceiptService,
  ) {
    super();
  }

  @Post('paystack/success')
  @SetMetadata('permissions', ['billing.payments.paystack'])
  async handlePaystackSuccess(
    @CurrentUser() user: User,
    @Body() dto: PaystackSuccessDto,
  ) {
    return this.paymentsService.handlePaystackSuccess(
      dto,
      user.companyId,
      user.id,
    );
  }

  @Get()
  listPayments(
    @CurrentUser() user: User,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.paymentsService.listPayments(user.companyId, query);
  }

  @Post('admin/payments/bank-transfer/finalize')
  @SetMetadata('permissions', ['payments.write'])
  async finalizeBankTransfer(
    @CurrentUser() user: User,
    @Body() dto: FinalizeBankTransferPaymentDto,
  ) {
    const result =
      await this.paymentsService.finalizePendingBankTransferPayment(
        dto,
        user.companyId,
        user.id,
      );

    // Side effects AFTER commit
    if (result?.receipt?.paymentId) {
      await this.receipts.generateReceiptPdfUrl(
        user.companyId,
        result.receipt.paymentId,
      );
    }

    return { data: result };
  }
}
