// dto/request-dispatch.dto.ts
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RequestDispatchDto {
  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ConfirmDispatchDto {
  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelDispatchDto {
  @IsOptional()
  @IsString()
  note?: string;
}
