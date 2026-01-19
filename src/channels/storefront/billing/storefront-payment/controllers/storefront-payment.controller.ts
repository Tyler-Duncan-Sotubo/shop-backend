// src/modules/billing/payments/controllers/payments.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PresignPaymentEvidenceDto } from '../dto/presign.dto';
import { PaymentService } from 'src/domains/billing/payment/services/payment.service';
import { StorefrontGuard } from 'src/channels/storefront/common/guard/storefront.guard';
import { CurrentCompanyId } from 'src/channels/storefront/common/decorators/current-company-id.decorator';

@Controller('payments')
export class PaymentController extends BaseController {
  constructor(private readonly paymentsService: PaymentService) {
    super();
  }
  // Store Frontend-safe endpoints could go here
  @UseGuards(StorefrontGuard)
  @Post(':paymentId/evidence/presign')
  @SetMetadata('permissions', ['payments.write'])
  async presignEvidence(
    @CurrentCompanyId() companyId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: PresignPaymentEvidenceDto,
  ) {
    return this.paymentsService.presignPaymentEvidenceUpload({
      companyId,
      paymentId,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
    });
  }

  @UseGuards(StorefrontGuard)
  @Post(':paymentId/evidence/finalize')
  @SetMetadata('permissions', ['payments.write'])
  async finalizeEvidence(
    @CurrentCompanyId() companyId: string,
    @Param('paymentId') paymentId: string,
    @Body()
    dto: {
      key: string;
      url?: string;
      fileName?: string;
      mimeType?: string;
      note?: string;
    },
  ) {
    if (!dto?.key) throw new BadRequestException('key is required');

    // IMPORTANT: ensure payment belongs to this store (via order join)
    const row = await this.paymentsService.finalizePaymentEvidenceUpload({
      companyId,
      paymentId,
      key: dto.key,
      url: dto.url ?? null,
      fileName: dto.fileName ?? null,
      mimeType: dto.mimeType ?? null,
      note: dto.note ?? null,
    });

    return { data: row };
  }
}
