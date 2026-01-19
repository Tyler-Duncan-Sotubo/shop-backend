import { IsIn } from 'class-validator';

export class UpdateContactMessageStatusDto {
  @IsIn(['new', 'read', 'archived', 'spam'])
  status: 'new' | 'read' | 'archived' | 'spam';
}
