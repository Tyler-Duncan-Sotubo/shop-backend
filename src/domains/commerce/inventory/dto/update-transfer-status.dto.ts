import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTransferStatusDto {
  @IsIn(['pending', 'in_transit', 'completed', 'cancelled'])
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  notes?: string;
}
