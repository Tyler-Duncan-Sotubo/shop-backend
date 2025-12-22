// src/modules/billing/invoice/controllers/invoices.controller.ts
import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceFromOrderDto } from './dto/create-invoice-from-order.dto';
import { InvoiceIdParamDto } from './dto/invoice-id.param.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { InvoiceLineIdParamDto } from './dto/invoice-line-id.param.dto';
import { UpdateInvoiceLineDto } from './dto/update-invoice-line.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { UpdateInvoiceDraftDto } from './dto/update-invoice-draft.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController extends BaseController {
  constructor(private readonly invoiceService: InvoiceService) {
    super();
  }

  @Post('from-order')
  @SetMetadata('permissions', ['billing.invoices.createFromOrder'])
  async createDraftFromOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateInvoiceFromOrderDto,
  ) {
    return this.invoiceService.createDraftFromOrder(dto, user.companyId);
  }

  @Post(':invoiceId/recalculate')
  @SetMetadata('permissions', ['billing.invoices.recalculate'])
  async recalculateDraftTotals(
    @CurrentUser() user: User,
    @Param() params: InvoiceIdParamDto,
  ) {
    return this.invoiceService.recalculateDraftTotals(
      user.companyId,
      params.invoiceId,
    );
  }

  @Post(':invoiceId/issue')
  @SetMetadata('permissions', ['billing.invoices.issue'])
  async issueInvoice(
    @CurrentUser() user: User,
    @Param() params: InvoiceIdParamDto,
    @Body() dto: IssueInvoiceDto,
  ) {
    return this.invoiceService.issueInvoice(
      params.invoiceId,
      dto,
      user.companyId,
    );
  }

  @Get(':invoiceId')
  @SetMetadata('permissions', ['billing.invoices.read'])
  async getInvoice(
    @CurrentUser() user: User,
    @Param() params: InvoiceIdParamDto,
  ) {
    return this.invoiceService.getInvoiceWithLines(
      user.companyId,
      params.invoiceId,
    );
  }

  @Get()
  @SetMetadata('permissions', ['billing.invoices.read'])
  async listInvoices(
    @CurrentUser() user: User,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoiceService.listInvoices(user.companyId, query);
  }

  @Patch(':invoiceId')
  async updateDraftInvoice(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateInvoiceDraftDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    const data = await this.invoiceService.updateDraftInvoice(
      user.companyId,
      invoiceId,
      dto,
      { userId: user.id, ip },
    );

    return { data };
  }

  @Patch(':invoiceId/lines/:lineId')
  @SetMetadata('permissions', ['billing.invoices.updateDraft'])
  async updateDraftLine(
    @CurrentUser() user: User,
    @Param() params: InvoiceLineIdParamDto,
    @Body() dto: UpdateInvoiceLineDto,
    @Ip() ip: string,
  ) {
    return this.invoiceService.updateDraftLineAndRecalculate(
      user.companyId,
      params.invoiceId,
      params.lineId,
      dto,
      { userId: user.id, ip },
    );
  }

  // Sync Invoice Series

  @Post('sync-invoice-series')
  async syncInvoiceSeries(@CurrentUser() user: User) {
    await this.invoiceService.seedDefaultInvoiceSeriesForCompany(
      user.companyId,
    );
    return { message: 'Invoice series synchronized successfully.' };
  }
}
