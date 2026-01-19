import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateTaxDto } from './dto/create-tax.dto';
import { TaxIdParamDto } from './dto/tax-id.param.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { ListTaxesQueryDto } from './dto/list-taxes.query.dto';
import { TaxService } from 'src/domains/billing/tax/tax.service';
export declare class TaxController extends BaseController {
    private readonly taxService;
    constructor(taxService: TaxService);
    create(user: User, dto: CreateTaxDto): Promise<any>;
    list(user: User, q: ListTaxesQueryDto): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    get(user: User, p: TaxIdParamDto): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(user: User, p: TaxIdParamDto, dto: UpdateTaxDto): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivate(user: User, p: TaxIdParamDto): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    setDefault(user: User, p: TaxIdParamDto): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
