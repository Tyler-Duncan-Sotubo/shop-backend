import { InventoryManagerPermissions } from './inventory-manager.permission';
import { ManagerPermissions } from './manager.permissions';
import { MarketingPermissions } from './marketing.permissions';
import { OwnerPermissions } from './owner.permissions';
import { SalesPermissions } from './sales.permissions';
import { StaffPermissions } from './staff.permissions';
import { SupportPermissions } from './support.permissions';
import { WarehouseStaffPermissions } from './warehouse-staff.permissions';

export const DefaultRolePermissions: Record<string, string[]> = {
  owner: OwnerPermissions,
  manager: ManagerPermissions,
  marketing: MarketingPermissions,
  sales: SalesPermissions,
  staff: StaffPermissions,
  support: SupportPermissions,
  warehouse_staff: WarehouseStaffPermissions,
  inventory_manager: InventoryManagerPermissions,
};
