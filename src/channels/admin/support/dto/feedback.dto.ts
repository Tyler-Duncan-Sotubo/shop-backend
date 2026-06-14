import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['bug', 'feature', 'ux', 'performance', 'other'])
  category!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsOptional()
  platform?: string;
}
