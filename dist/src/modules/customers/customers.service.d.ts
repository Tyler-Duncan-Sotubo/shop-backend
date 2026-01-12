import { db } from 'src/drizzle/types/drizzle';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { AuthCustomer } from './types/customers';
import { CacheService } from 'src/common/cache/cache.service';
type ListCustomerOrdersOpts = {
    limit?: number;
    offset?: number;
    status?: string;
};
type CustomerOrderItem = {
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
};
type CustomerOrderRow = {
    id: string;
    orderNumber: string | null;
    status: string;
    createdAt: Date;
    currency: string | null;
    items: CustomerOrderItem[];
};
export declare class CustomersService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    getProfile(authCustomer: AuthCustomer): Promise<{
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
    updateProfile(authCustomer: AuthCustomer, dto: UpdateCustomerProfileDto): Promise<{
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
    listAddresses(authCustomer: AuthCustomer): Promise<{
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
    getAddress(authCustomer: AuthCustomer, addressId: string): Promise<{
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
    createAddress(authCustomer: AuthCustomer, dto: CreateCustomerAddressDto): Promise<{
        id: string;
        country: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        customerId: string;
        city: string;
        postalCode: string | null;
        state: string | null;
        label: string | null;
        line1: string;
        line2: string | null;
        isDefaultBilling: boolean;
        isDefaultShipping: boolean;
    }>;
    updateAddress(authCustomer: AuthCustomer, addressId: string, dto: UpdateCustomerAddressDto): Promise<{
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
    deleteAddress(authCustomer: AuthCustomer, addressId: string): Promise<{
        success: boolean;
    }>;
    private clearDefaultFlag;
    getCustomerActivityBundle(authCustomer: AuthCustomer, opts?: {
        storeId?: string;
        ordersLimit?: number;
        reviewsLimit?: number;
        quotesLimit?: number;
    }): Promise<{
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
    listCustomerOrders(authCustomer: AuthCustomer, storeId?: string, opts?: ListCustomerOrdersOpts): Promise<{
        items: CustomerOrderRow[];
        total: number;
        limit: number;
        offset: number;
    }>;
    listCustomerPurchasedProducts(authCustomer: AuthCustomer, storeId?: string, opts?: {
        limit?: number;
        offset?: number;
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
    listCustomerReviews(authCustomer: AuthCustomer, storeId?: string, opts?: {
        limit?: number;
        offset?: number;
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
export {};
