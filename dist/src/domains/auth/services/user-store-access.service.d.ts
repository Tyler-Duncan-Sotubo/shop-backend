import { db } from "../../../infrastructure/drizzle/types/drizzle";
export declare class UserStoreAccessService {
    private readonly db;
    constructor(db: db);
    grantAccess(userId: string, storeIds: string[], grantedBy: string): Promise<void>;
    syncAccess(userId: string, storeIds: string[], grantedBy: string): Promise<void>;
    getStoresForUser(userId: string): Promise<{
        id: string;
        name: string;
        imageUrl: string | null;
    }[]>;
}
