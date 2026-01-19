import { IsUUID } from 'class-validator';

export class TaxIdParamDto {
  @IsUUID('7')
  taxId!: string;
}
