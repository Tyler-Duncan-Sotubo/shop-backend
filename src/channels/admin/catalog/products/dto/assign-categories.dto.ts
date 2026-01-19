import { IsArray, IsString } from 'class-validator';

export class AssignProductCategoriesDto {
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];
}
