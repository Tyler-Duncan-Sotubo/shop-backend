// src/modules/billing/payments/controllers/payments.controller.ts
import {
  Body,
  Controller,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { PaymentService } from './payment.service';
import { PaystackSuccessDto } from './dto/paystack-success.dto';
import { RecordBankTransferDto } from './dto/record-bank-transfer.dto';
import {
  ConfirmBankTransferDto,
  PaymentIdParamDto,
} from './dto/confirm-bank-transfer.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController extends BaseController {
  constructor(private readonly paymentsService: PaymentService) {
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

  @Post('bank-transfer')
  @SetMetadata('permissions', ['billing.payments.bankTransfer.create'])
  async recordBankTransfer(
    @CurrentUser() user: User,
    @Body() dto: RecordBankTransferDto,
  ) {
    return this.paymentsService.recordBankTransfer(dto, user.companyId);
  }

  @Post('bank-transfer/:paymentId/confirm')
  @SetMetadata('permissions', ['billing.payments.bankTransfer.confirm'])
  async confirmBankTransferAndApply(
    @CurrentUser() user: User,
    @Param() params: PaymentIdParamDto,
    @Body() dto: ConfirmBankTransferDto,
  ) {
    return this.paymentsService.confirmBankTransferAndApply(
      params.paymentId,
      dto,
      user.companyId,
      user.id,
    );
  }
}
