export declare class CreateBaseDto {
    key: string;
    version?: number;
    theme?: Record<string, any>;
    ui?: Record<string, any>;
    seo?: Record<string, any>;
    header?: Record<string, any>;
    footer?: Record<string, any>;
    pages?: Record<string, any>;
    isActive?: boolean;
}
export declare class UpdateBaseDto {
    key?: string;
    version?: number;
    theme?: Record<string, any>;
    ui?: Record<string, any>;
    seo?: Record<string, any>;
    header?: Record<string, any>;
    footer?: Record<string, any>;
    pages?: Record<string, any>;
    isActive?: boolean;
}
