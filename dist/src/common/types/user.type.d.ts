export type User = {
    id: string;
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'manager' | 'support' | 'staff';
    companyId: string;
    permissions: string[];
    firstName: string;
    lastName: string;
};
