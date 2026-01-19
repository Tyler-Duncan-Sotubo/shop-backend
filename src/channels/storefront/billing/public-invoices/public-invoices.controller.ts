import { Controller, Param, Get } from '@nestjs/common';
import { PublicInvoicesService } from 'src/domains/billing/public-invoices/public-invoices.service';

@Controller('invoices')
export class PublicInvoicesController {
  constructor(private readonly links: PublicInvoicesService) {}

  @Get('public/:token')
  async getInvoice(@Param('token') token: string) {
    const res = await this.links.getPublicInvoiceByToken(token);
    return { data: res.data };
  }

  @Get('public/:token/pdf')
  async getPdf(@Param('token') token: string) {
    const res = await this.links.getPublicPdfUrlByToken(token);
    return { data: res };
  }
}
