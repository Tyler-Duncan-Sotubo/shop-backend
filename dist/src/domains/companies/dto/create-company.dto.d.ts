export declare class CreateCompanyDto {
    companyName: string;
    slug: string;
    country: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    role?: string;
    allowMarketingEmails?: boolean;
}
