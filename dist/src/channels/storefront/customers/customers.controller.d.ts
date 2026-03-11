import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { CustomersService } from 'src/domains/customers/customers.service';
import { CustomerAuthService } from 'src/domains/customers/customer-auth.service';
import { AuthCustomer } from '../common/types/customers';
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
    updatePassword(customer: AuthCustomer, body: {
        currentPassword: string;
        newPassword: string;
    }, companyId: string): Promise<{
        ok: boolean;
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
    getCustomerActivity(customer: AuthCustomer, storeId: string): Promise<{
        orders: ({
            id: any;
            orderNumber: any;
            status: any;
            createdAt: any;
            currency: any;
            totalMinor: any;
        } | {
            id: any;
            orderNumber: any;
            status: any;
            createdAt: any;
            currency: any;
            totalMinor: any;
        })[];
        products: {
            id: string;
            name: string;
            slug: string;
            imageUrl: string | null;
            lastOrderedAt: Date;
        }[];
        quotes: {
            id: string;
            storeId: string;
            status: string;
            customerEmail: string;
            customerNote: string | null;
            expiresAt: Date | null;
            createdAt: Date;
        }[];
        reviews: {
            id: string;
            productId: string;
            rating: number;
            review: string;
            createdAt: Date;
            product: {
                id: string;
                name: any;
                slug: any;
                imageUrl: any;
            } | null;
        }[];
    }>;
    listMyOrders(customer: AuthCustomer, storeId: string, q: {
        limit?: string;
        offset?: string;
        status?: string;
    }): Promise<{
        items: {
            id: string;
            orderNumber: string | null;
            status: string;
            createdAt: Date;
            currency: string | null;
            items: {
                id: string;
                variantId: string | null;
                quantity: number;
                name: string;
                imageUrl: string | null;
                product: {
                    id: string;
                    name: string | null;
                    slug: string | null;
                } | null;
            }[];
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    listMyProducts(customer: AuthCustomer, storeId: string, q: {
        limit?: string;
        offset?: string;
    }): Promise<{
        items: ({
            id: any;
            name: any;
            slug: any;
            imageUrl: any;
            lastOrderedAt: Date;
        } | {
            id: any;
            name: any;
            slug: any;
            imageUrl: any;
            lastOrderedAt: Date;
        } | {
            id: any;
            name: any;
            slug: any;
            imageUrl: any;
            lastOrderedAt: Date;
        } | {
            id: any;
            name: any;
            slug: any;
            imageUrl: any;
            lastOrderedAt: Date;
        })[];
        total: number;
        limit: number;
        offset: number;
    }>;
    listMyReviews(customer: AuthCustomer, storeId: string, q: {
        limit?: string;
        offset?: string;
    }): Promise<{
        items: {
            id: string;
            productId: string;
            rating: number;
            review: string;
            createdAt: Date;
            product: {
                id: string;
                name: any;
                slug: any;
                imageUrl: any;
            } | null;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
}
