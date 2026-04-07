import { User } from 'src/channels/admin/common/types/user.type';
import { OptionsService } from 'src/domains/catalog/services/options.service';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateOptionDto, CreateOptionValueDto, UpdateOptionDto, UpdateOptionValueDto } from './dto';
export declare class VariantOptionsController extends BaseController {
    private readonly optionsService;
    constructor(optionsService: OptionsService);
    getOptionsForProduct(user: User, productId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        productId: string;
        position: number;
        values: {
            [x: string]: any;
        }[];
    }[]>;
    createOption(user: User, productId: string, dto: CreateOptionDto, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        productId: string;
        position: number;
    }>;
    updateOption(user: User, optionId: string, dto: UpdateOptionDto, ip: string): Promise<{
        id: string;
        companyId: string;
        productId: string;
        name: string;
        position: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteOption(user: User, optionId: string, ip: string): Promise<{
        success: boolean;
        disabledVariantsForPosition: number;
    }>;
    createOptionValue(user: User, optionId: string, dto: CreateOptionValueDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        value: string;
        position: number;
        productOptionId: string;
    }>;
    updateOptionValue(user: User, valueId: string, dto: UpdateOptionValueDto, ip: string): Promise<{
        id: string;
        companyId: string;
        productOptionId: string;
        value: string;
        position: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteOptionValue(user: User, valueId: string, ip: string): Promise<{
        success: boolean;
    }>;
}
