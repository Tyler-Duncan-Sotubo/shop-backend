import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { OptionsService } from '../services/options.service';
import { CreateOptionDto, UpdateOptionDto, CreateOptionValueDto, UpdateOptionValueDto } from '../dtos/options';
export declare class OptionsController extends BaseController {
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
        position: number;
        value: string;
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
