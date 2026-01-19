import { PartialType } from '@nestjs/mapped-types';
import { CreateStorefrontConfigDto } from './create-storefront-config.dto';

export class UpdateStorefrontConfigDto extends PartialType(CreateStorefrontConfigDto) {}
