import { PartialType } from '@nestjs/mapped-types';
import { CreatePickupLocationDto } from './create-pickup.dto';

export class UpdatePickupDto extends PartialType(CreatePickupLocationDto) {}
