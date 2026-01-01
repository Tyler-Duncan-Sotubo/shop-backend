import { User } from 'src/common/types/user.type';
import { AdminCustomersService } from './admin-customers.service';
import { CreateCustomerAddressAdminDto, ListCustomersDto, UpdateCustomerAddressAdminDto, UpdateCustomerAdminDto } from './dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateCustomerDto } from './dto/register-customer.dto';
export declare class AdminCustomersController extends BaseController {
    private readonly adminCustomers;
    constructor(adminCustomers: AdminCustomersService);
    adminRegister(user: User, dto: CreateCustomerDto): Promise<{
        customer: {
            id: string;
            companyId: string;
            displayName: string;
            billingEmail: string | null;
            firstName: string | null;
            lastName: string | null;
        };
        inviteToken: string;
    }>;
    bulkCreateCustomers(rows: any[], user: User, storeId: string | null): Promise<{
        insertedCount: any;
        items: any;
    }>;
    createAddress(user: User, customerId: string, dto: CreateCustomerAddressAdminDto): Promise<{
        id: string;
        createdAt: Date;
        country: string;
        updatedAt: Date;
        companyId: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        customerId: string;
        label: string | null;
        line1: string;
        line2: string | null;
        city: string;
        state: string | null;
        postalCode: string | null;
        isDefaultBilling: boolean;
        isDefaultShipping: boolean;
    }>;
    updateCustomerAddress(customerId: string, addressId: string, dto: UpdateCustomerAddressAdminDto, user: User): Promise<{
        id: string;
        companyId: string;
        customerId: string;
        label: string | null;
        firstName: string | null;
        lastName: string | null;
        line1: string;
        line2: string | null;
        city: string;
        state: string | null;
        postalCode: string | null;
        country: string;
        phone: string | null;
        isDefaultBilling: boolean;
        isDefaultShipping: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    list(user: User, dto: ListCustomersDto): Promise<{
        id: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
        billingEmail: string | null;
        phone: string | null;
        marketingOptIn: boolean;
        createdAt: Date;
        isActive: boolean;
        loginEmail: string | null;
        isVerified: boolean | null;
        lastLoginAt: Date | null;
    }[]>;
    get(user: User, customerId: string): Promise<{
        addresses: {
            id: string;
            customerId: string;
            label: string | null;
            firstName: string | null;
            lastName: string | null;
            line1: string;
            line2: string | null;
            city: string;
            state: string | null;
            postalCode: string | null;
            country: string;
            phone: string | null;
            isDefaultBilling: boolean;
            isDefaultShipping: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        id: string;
        companyId: string;
        displayName: string;
        billingEmail: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        marketingOptIn: boolean;
        createdAt: Date;
        isActive: boolean;
        loginEmail: string | null;
        isVerified: boolean | null;
        lastLoginAt: Date | null;
    }>;
    update(user: User, customerId: string, dto: UpdateCustomerAdminDto): Promise<{
        id: string;
        displayName: string;
        billingEmail: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        marketingOptIn: boolean;
        isActive: boolean;
    }>;
}
