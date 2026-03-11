// src/modules/billing/payments/controllers/payments.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
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

  @Get('admin/orders/bank-transfer/pending-review')
  @SetMetadata('permissions', ['payments.write'])
  async listPendingOrderPaymentsForReview(@CurrentUser() user: User) {
    const result = await this.paymentsService.listPendingOrderPaymentsForReview(
      user.companyId,
    );

    return { data: result };
  }

  @Get(':paymentId/review')
  @SetMetadata('permissions', ['payments.write'])
  async getPendingOrderPaymentById(
    @CurrentUser() user: User,
    @Param('paymentId') paymentId: string,
  ) {
    const result = await this.paymentsService.getPendingOrderPaymentById(
      user.companyId,
      paymentId,
    );

    return { data: result };
  }

  @Get(':paymentId/evidence')
  @SetMetadata('permissions', ['payments.write'])
  async getPaymentEvidence(
    @CurrentUser() user: User,
    @Param('paymentId') paymentId: string,
  ) {
    const result = await this.paymentsService.getPaymentEvidence(
      user.companyId,
      paymentId,
    );

    return { data: result };
  }

  @Post('admin/orders/bank-transfer/finalize')
  @SetMetadata('permissions', ['payments.write'])
  async finalizePendingOrderBankTransferPayment(
    @CurrentUser() user: User,
    @Body()
    dto: {
      paymentId: string;
      reference?: string | null;
      evidenceRequired?: boolean;
    },
  ) {
    const result =
      await this.paymentsService.finalizePendingOrderBankTransferPayment(
        dto,
        user.companyId,
        user.id,
      );

    if (result?.receipt?.paymentId) {
      await this.receipts.generateReceiptPdfUrl(
        user.companyId,
        result.receipt.paymentId,
      );
    }

    return { data: result };
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

    if (result?.receipt?.paymentId) {
      await this.receipts.generateReceiptPdfUrl(
        user.companyId,
        result.receipt.paymentId,
      );
    }

    return { data: result };
  }
}
