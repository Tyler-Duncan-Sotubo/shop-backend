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
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { PaymentService } from './payment.service';
import { PaystackSuccessDto } from './dto/paystack-success.dto';
import { ListPaymentsQueryDto } from './dto/payment-list.dto';

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

  @Get()
  listPayments(
    @CurrentUser() user: User,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.paymentsService.listPayments(user.companyId, query);
  }
}
