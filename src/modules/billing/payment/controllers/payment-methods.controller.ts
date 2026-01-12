// src/modules/billing/payments/controllers/store-payment-methods.controller.ts
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
import { PaymentMethodsService } from '../services/payment-methods.service';
import {
  ToggleStorePaymentMethodDto,
  UpsertBankTransferConfigDto,
  UpsertGatewayConfigDto,
} from '../dto/payment-methods.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController extends BaseController {
  constructor(private readonly storeMethods: PaymentMethodsService) {
    super();
  }

  /**
   * List all configured payment methods for a store (admin)
   * GET /payments/admin/stores/payment-methods?storeId=...
   */
  @Get('admin/stores/payment-methods')
  @SetMetadata('permissions', ['payments.read'])
  async listStoreMethods(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
  ) {
    const data = await this.storeMethods.listStoreMethods(
      user.companyId,
      storeId,
    );
    return { data };
  }

  /**
   * Storefront-safe: methods available at checkout (no secrets)
   * GET /payments/admin/stores/payment-methods/checkout?storeId=...
   */
  @Get('admin/stores/payment-methods/checkout')
  @SetMetadata('permissions', ['payments.read'])
  async getCheckoutMethods(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
  ) {
    const data = await this.storeMethods.getCheckoutMethods(
      user.companyId,
      storeId,
    );
    return { data };
  }

  /**
   * Toggle a method on/off (bank_transfer, gateway provider, etc.)
   * POST /payments/admin/stores/payment-methods/toggle
   */
  @Post('admin/stores/payment-methods/toggle')
  @SetMetadata('permissions', ['payments.write'])
  async toggleMethod(
    @CurrentUser() user: User,
    @Body() dto: ToggleStorePaymentMethodDto,
  ) {
    const data = await this.storeMethods.toggle(user.companyId, dto);
    return { data };
  }

  /**
   * Upsert gateway config (Paystack/Stripe)
   * POST /payments/admin/stores/payment-methods/gateway
   */
  @Post('admin/stores/payment-methods/gateway')
  @SetMetadata('permissions', ['payments.write'])
  async upsertGateway(
    @CurrentUser() user: User,
    @Body() dto: UpsertGatewayConfigDto,
  ) {
    const data = await this.storeMethods.upsertGateway(user.companyId, dto);
    return { data };
  }

  /**
   * Upsert bank transfer config (manual payment method)
   * POST /payments/admin/stores/payment-methods/bank-transfer
   */
  @Post('admin/stores/payment-methods/bank-transfer')
  @SetMetadata('permissions', ['payments.write'])
  async upsertBankTransfer(
    @CurrentUser() user: User,
    @Body() dto: UpsertBankTransferConfigDto,
  ) {
    const data = await this.storeMethods.upsertBankTransfer(
      user.companyId,
      dto,
    );
    return { data };
  }
}
