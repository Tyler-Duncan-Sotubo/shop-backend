import { CustomersService } from './customers.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { AuthCustomer } from './types/customers';
import { CustomerAuthService } from './customer-auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
export declare class CustomersController {
    private readonly customersService;
    private readonly customerAuthService;
    constructor(customersService: CustomersService, customerAuthService: CustomerAuthService);
    register(dto: RegisterCustomerDto, companyId: string): Promise<{
        customer: {
            id: string;
            companyId: string;
            email: string;
            name: string;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
    }>;
    login(dto: LoginCustomerDto, companyId: string): Promise<{
        customer: {
            id: string;
            companyId: string;
            email: string;
            name: string;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
    }>;
    getProfile(customer: AuthCustomer): Promise<{
        id: string;
        companyId: string;
        displayName: string;
        type: "individual" | "business";
        billingEmail: string | null;
        phone: string | null;
        taxId: string | null;
        marketingOptIn: boolean;
        isActive: boolean;
        createdAt: Date;
        loginEmail: string | null;
        isVerified: boolean | null;
        lastLoginAt: Date | null;
    }>;
    updateProfile(customer: AuthCustomer, dto: UpdateCustomerProfileDto): Promise<{
        id: string;
        companyId: string;
        displayName: string;
        type: "individual" | "business";
        billingEmail: string | null;
        phone: string | null;
        taxId: string | null;
        marketingOptIn: boolean;
        isActive: boolean;
    }>;
    listAddresses(customer: AuthCustomer): Promise<{
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
    }[]>;
    createAddress(customer: AuthCustomer, dto: CreateCustomerAddressDto): Promise<{
        id: string;
        country: string;
        createdAt: Date;
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
    updateAddress(customer: AuthCustomer, id: string, dto: UpdateCustomerAddressDto): Promise<{
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
    deleteAddress(customer: AuthCustomer, id: string): Promise<{
        success: boolean;
    }>;
}
