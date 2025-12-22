import { ManagerPermissions } from './manager.permissions';
import { OwnerPermissions } from './owner.permissions';
import { StaffPermissions } from './staff.permissions';
import { SupportPermissions } from './support.permissions';

export const DefaultRolePermissions: Record<string, string[]> = {
  owner: OwnerPermissions,
  manager: ManagerPermissions,
  staff: StaffPermissions,
  support: SupportPermissions,
};
