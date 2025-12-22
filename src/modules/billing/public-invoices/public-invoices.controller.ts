import {
  Controller,
  Post,
  Param,
  SetMetadata,
  UseGuards,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { PublicInvoicesService } from './public-invoices.service';

@Controller('invoices')
export class PublicInvoicesController {
  constructor(private readonly links: PublicInvoicesService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':invoiceId/public-link')
  @SetMetadata('permissions', ['billing.invoices.read'])
  async createOrGet(
    @CurrentUser() user: User,
    @Param('invoiceId') invoiceId: string,
  ) {
    const link = await this.links.ensureLink({
      companyId: user.companyId,
      invoiceId,
      createdBy: user.id,
    });
    return { data: link };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':invoiceId/public-link/revoke')
  @SetMetadata('permissions', ['billing.invoices.read'])
  async revoke(
    @CurrentUser() user: User,
    @Param('invoiceId') invoiceId: string,
  ) {
    const link = await this.links.revokeLink(user.companyId, invoiceId);
    return { data: link };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':invoiceId/public-link/rotate')
  @SetMetadata('permissions', ['billing.invoices.read'])
  async rotate(
    @CurrentUser() user: User,
    @Param('invoiceId') invoiceId: string,
  ) {
    const link = await this.links.rotateLink({
      companyId: user.companyId,
      invoiceId,
      rotatedBy: user.id,
    });
    return { data: link };
  }

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
