import { PartialType } from '@nestjs/mapped-types';
import { CreatePublicInvoiceDto } from './create-public-invoice.dto';

export class UpdatePublicInvoiceDto extends PartialType(CreatePublicInvoiceDto) {}
