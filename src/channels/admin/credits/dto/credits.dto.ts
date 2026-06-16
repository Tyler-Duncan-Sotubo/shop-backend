import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TopUpDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['email', 'sms'])
  channel!: 'email' | 'sms';

  @IsString()
  @IsOptional()
  note?: string;
}

export class AdjustDto {
  @IsNumber()
  @Type(() => Number)
  amount!: number; // can be positive or negative

  @IsString()
  @IsNotEmpty()
  @IsIn(['email', 'sms'])
  channel!: 'email' | 'sms';

  @IsString()
  @IsNotEmpty()
  note!: string;
}

export class GetTransactionsDto {
  @IsString()
  @IsOptional()
  @IsIn(['email', 'sms'])
  channel?: 'email' | 'sms';

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}
