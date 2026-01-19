import { IsArray, IsString } from 'class-validator';

export class AssignCategoriesDto {
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];
}
