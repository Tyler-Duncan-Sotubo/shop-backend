import {
  Controller,
  Post,
  Param,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PublicInvoicesService } from 'src/domains/billing/public-invoices/public-invoices.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class PublicInvoicesController {
  constructor(private readonly links: PublicInvoicesService) {}

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

  @Post(':invoiceId/public-link/revoke')
  @SetMetadata('permissions', ['billing.invoices.read'])
  async revoke(
    @CurrentUser() user: User,
    @Param('invoiceId') invoiceId: string,
  ) {
    const link = await this.links.revokeLink(user.companyId, invoiceId);
    return { data: link };
  }

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
}
