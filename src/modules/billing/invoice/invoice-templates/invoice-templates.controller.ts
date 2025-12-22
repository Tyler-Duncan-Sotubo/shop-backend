// src/modules/billing/controllers/invoice-templates.controller.ts
import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { UpdateInvoiceBrandingDto } from './dto/update-invoice-branding.dto';
import { InvoicePdfService } from './invoice-pdf.service';
import { UpdateInvoiceLogoDto } from './dto/update-invoice-logo.dto';

@Controller('invoice-templates')
@UseGuards(JwtAuthGuard)
export class InvoiceTemplatesController extends BaseController {
  constructor(
    private readonly invoiceTemplatesService: InvoiceTemplatesService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {
    super();
  }

  // ----------------- System Templates (read) -----------------

  @Get()
  @SetMetadata('permissions', ['billing.invoiceTemplates.read'])
  async listSystemTemplates() {
    return this.invoiceTemplatesService.listSystemTemplates();
  }

  @Get(':templateId')
  @SetMetadata('permissions', ['billing.invoiceTemplates.read'])
  async getSystemTemplateById(@Param('templateId') templateId: string) {
    return this.invoiceTemplatesService.getSystemTemplateById(templateId);
  }

  // ----------------- System Templates (seed) -----------------
  // NOTE: keep only ONE seed route and protect it.
  @Post('seed/system')
  // @SetMetadata('permissions', ['billing.invoiceTemplates.seed'])
  async seedSystemInvoiceTemplates(
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.invoiceTemplatesService.seedSystemInvoiceTemplates(user, ip);
  }

  // ----------------- Company Branding (read/write) -----------------
  @Get('branding')
  @SetMetadata('permissions', ['billing.invoiceBranding.read'])
  async getInvoiceBranding(
    @CurrentUser() user: User,
    @Query('storeId') storeId?: string,
  ) {
    return this.invoiceTemplatesService.getBranding(
      user.companyId,
      storeId ?? null,
    );
  }

  @Post('branding')
  @SetMetadata('permissions', ['billing.invoiceBranding.update'])
  async upsertInvoiceBranding(
    @CurrentUser() user: User,
    @Body() dto: UpdateInvoiceBrandingDto,
    @Ip() ip: string,
  ) {
    return this.invoiceTemplatesService.upsertCompanyBranding(user, dto, ip);
  }

  // ----------------- PREVIEW (HTML) -----------------
  // Frontend uses iframe srcDoc with returned html
  @Get('preview/html')
  @SetMetadata('permissions', ['billing.invoiceTemplates.preview'])
  async previewHtml(
    @CurrentUser() user: User,
    @Query('templateId') templateId?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.invoiceTemplatesService.previewForCompany(user.companyId, {
      templateId,
      storeId: storeId ?? null,
    });
  }

  // ----------------- PREVIEW (PDF) -----------------
  // Frontend opens/embeds URL; returns application/pdf
  @Get('preview/pdf')
  @SetMetadata('permissions', ['billing.invoiceTemplates.preview'])
  async previewPdf(
    @CurrentUser() user: User,
    @Query('storeId') storeId: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.invoicePdfService.generatePreviewPdf(user.companyId, {
      templateId,
      storeId: storeId,
    });
  }

  // ----------------- Generate PDF for a real invoice -----------------
  @Post(':invoiceId/pdf')
  @SetMetadata('permissions', ['billing.invoices.pdf.generate'])
  async generateForInvoice(
    @CurrentUser() user: User,
    @Param('invoiceId') invoiceId: string,
    @Query('storeId') storeId: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.invoicePdfService.generateAndUploadPdf({
      companyId: user.companyId,
      generatedBy: user.id,
      invoiceId,
      templateId,
      storeId: storeId ?? null,
    });
  }

  @Post('branding/logo')
  @SetMetadata('permissions', ['billing.invoiceBranding.update'])
  async uploadInvoiceBrandingLogo(
    @CurrentUser() user: User,
    @Body() dto: UpdateInvoiceLogoDto,
    @Ip() ip: string,
  ) {
    return this.invoiceTemplatesService.uploadBrandingLogo(user, dto, ip);
  }
}
