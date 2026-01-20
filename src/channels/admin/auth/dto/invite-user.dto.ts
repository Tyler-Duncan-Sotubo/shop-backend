import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Existing role assignment (no creation)
   */
  @IsUUID()
  @IsOptional()
  companyRoleId?: string;

  /**
   * Create a new role during invite
   */
  @IsBoolean()
  @IsOptional()
  createRole?: boolean;

  @IsString()
  @IsOptional()
  roleName?: string;

  /**
   * Optional base role (template)
   * Used only if createRole=true
   */
  @IsUUID()
  @IsOptional()
  baseRoleId?: string;

  /**
   * Permissions for the new role
   */
  @IsArray()
  @IsUUID('7', { each: true })
  @IsOptional()
  permissionIds?: string[];
}
