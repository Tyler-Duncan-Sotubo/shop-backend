export declare class RegisterCustomerDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    marketingOptIn?: boolean;
}
export declare class CreateCustomerDto {
    storeId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    marketingOptIn?: boolean;
}
