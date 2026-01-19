import { AuditService } from '../../../domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
export declare class AuditController extends BaseController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getAuditLogs(user: User): Promise<{
        id: string;
        timestamp: Date;
        entity: string;
        entityId: string | null;
        action: string;
        details: string | null;
        changes: unknown;
        ipAddress: string | null;
        name: unknown;
        role: "owner" | "manager" | "staff" | "support";
    }[]>;
    getAuthenticationLogs(user: User): Promise<{
        id: string;
        timestamp: Date;
        entity: string;
        entityId: string | null;
        action: string;
        details: string | null;
        changes: unknown;
        ipAddress: string | null;
        name: unknown;
        role: "owner" | "manager" | "staff" | "support";
    }[]>;
}
