// src/modules/billing/payments/controllers/paystack-storefront.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';

import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { StorefrontGuard } from 'src/channels/storefront/common/guard/storefront.guard';
import { CurrentCompanyId } from 'src/channels/storefront/common/decorators/current-company-id.decorator';
import { CurrentStoreId } from 'src/channels/storefront/common/decorators/current-store.decorator';
import { PaystackService } from 'src/domains/billing/payment/services/paystack.service';

@Controller('payments/paystack')
@UseGuards(StorefrontGuard)
export class PaystackStorefrontController extends BaseController {
  constructor(private readonly paystackService: PaystackService) {
    super();
  }

  // --------------------------------------------------------
  // Get Paystack checkout config (public safe config)
  // --------------------------------------------------------

  @Get('/public/config')
  @SetMetadata('permissions', ['payments.read'])
  async getConfig(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
  ) {
    const data = await this.paystackService.getPublicCheckoutConfig(
      companyId,
      storeId,
    );

    return { data };
  }

  // --------------------------------------------------------
  // Initialize transaction
  // --------------------------------------------------------

  @Post('/public/initialize')
  @SetMetadata('permissions', ['payments.write'])
  async initialize(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Body()
    dto: {
      email: string;
      amount: number;
      currency?: string;
      reference: string;
      callbackUrl?: string;
      metadata?: Record<string, any>;
      channels?: string[];
    },
  ) {
    if (!dto?.email) {
      throw new BadRequestException('email is required');
    }

    if (!dto?.reference) {
      throw new BadRequestException('reference is required');
    }

    if (!dto?.amount || Number(dto.amount) <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }

    const data = await this.paystackService.initializeTransaction({
      companyId,
      storeId,
      email: dto.email,
      amount: Number(dto.amount),
      currency: dto.currency ?? 'NGN',
      reference: dto.reference,
      callbackUrl: dto.callbackUrl,
      metadata: dto.metadata,
      channels: dto.channels,
    });

    return { data };
  }

  // --------------------------------------------------------
  // Verify transaction
  // --------------------------------------------------------

  @Get('/public/verify/:reference')
  @SetMetadata('permissions', ['payments.read'])
  async verify(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Param('reference') reference: string,
  ) {
    if (!reference) {
      throw new BadRequestException('reference is required');
    }

    const data = await this.paystackService.verifyAndSyncOrder(
      companyId,
      storeId,
      reference,
    );

    return { data };
  }
}
