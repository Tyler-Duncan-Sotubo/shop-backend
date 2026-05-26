import { AuditService } from '../../../domains/audit/audit.service';
import { User } from "../common/types/user.type";
import { BaseController } from "../../../infrastructure/interceptor/base.controller";
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
        name: any;
        role: string;
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
        name: any;
        role: string;
    }[]>;
}
