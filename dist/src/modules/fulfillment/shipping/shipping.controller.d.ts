import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateCarrierDto, CreateRateDto, CreateZoneDto, QuoteShippingDto, UpdateRateDto, UpsertRateTierDto, UpsertZoneLocationDto } from './dto';
import { ShippingZonesService } from './services/shipping-zones.service';
import { ShippingCarriersService } from './services/shipping-carriers.service';
import { ShippingRatesService } from './services/shipping-rates.service';
export declare class ShippingController extends BaseController {
    private readonly zones;
    private readonly carriers;
    private readonly rates;
    constructor(zones: ShippingZonesService, carriers: ShippingCarriersService, rates: ShippingRatesService);
    listZones(user: User, storeId: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        name: string;
        isActive: boolean;
        priority: number;
        description: string | null;
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createZone(user: User, dto: CreateZoneDto, ip: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        priority: number;
        description: string | null;
        metadata: Record<string, any> | null;
    }>;
    updateZone(user: User, zoneId: string, dto: Partial<CreateZoneDto>, ip: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        name: string;
        isActive: boolean;
        priority: number;
        description: string | null;
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteZone(user: User, zoneId: string, ip: string): Promise<{
        ok: boolean;
    }>;
    listZoneLocations(user: User, zoneId: string): Promise<{
        id: string;
        countryCode: string;
        regionCode: string | null;
        area: string | null;
        zoneName: string;
    }[]>;
    upsertZoneLocation(user: User, dto: UpsertZoneLocationDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        zoneId: string;
        countryCode: string;
        regionCode: string | null;
        area: string | null;
        postalCodePattern: string | null;
    }>;
    updateZoneLocation(user: User, locationId: string, dto: UpsertZoneLocationDto, ip: string): Promise<{
        id: string;
        companyId: string;
        zoneId: string;
        countryCode: string;
        regionCode: string | null;
        area: string | null;
        postalCodePattern: string | null;
        createdAt: Date;
    }>;
    removeZoneLocation(user: User, locationId: string, ip: string): Promise<{
        ok: boolean;
    }>;
    listCarriers(user: User): Promise<{
        id: string;
        companyId: string;
        providerKey: string;
        name: string;
        isActive: boolean;
        settings: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createCarrier(user: User, dto: CreateCarrierDto, ip: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        providerKey: string;
        settings: Record<string, any> | null;
    }>;
    updateCarrier(user: User, carrierId: string, dto: Partial<CreateCarrierDto>, ip: string): Promise<{
        id: string;
        companyId: string;
        providerKey: string;
        name: string;
        isActive: boolean;
        settings: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteCarrier(user: User, carrierId: string, ip: string): Promise<{
        ok: boolean;
    }>;
    listRates(user: User, zoneId?: string, storeId?: string): Promise<{
        id: string;
        zoneId: string;
        name: string;
        flatAmount: string | null;
        calc: "flat" | "weight";
        isDefault: boolean;
        isActive: boolean;
        priority: number;
        type: "flat" | "weight" | "price";
    }[]>;
    createRate(user: User, dto: CreateRateDto, ip: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        type: "flat" | "weight" | "price";
        isDefault: boolean;
        priority: number;
        metadata: Record<string, any> | null;
        zoneId: string;
        flatAmount: string | null;
        minOrderSubtotal: string | null;
        maxOrderSubtotal: string | null;
        minWeightGrams: number | null;
        maxWeightGrams: number | null;
        carrierId: string | null;
        carrierServiceCode: string | null;
        carrierServiceName: string | null;
        minDeliveryDays: number | null;
        maxDeliveryDays: number | null;
        calc: "flat" | "weight";
    }>;
    updateRate(user: User, rateId: string, dto: UpdateRateDto, ip: string): Promise<{
        id: string;
        isDefault: boolean;
        companyId: string;
        zoneId: string;
        name: string;
        isActive: boolean;
        type: "flat" | "weight" | "price";
        flatAmount: string | null;
        minOrderSubtotal: string | null;
        maxOrderSubtotal: string | null;
        minWeightGrams: number | null;
        maxWeightGrams: number | null;
        carrierId: string | null;
        carrierServiceCode: string | null;
        carrierServiceName: string | null;
        minDeliveryDays: number | null;
        maxDeliveryDays: number | null;
        priority: number;
        calc: "flat" | "weight";
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteRate(user: User, rateId: string, ip: string): Promise<{
        ok: boolean;
    }>;
    listTiers(user: User, rateId: string): Promise<{
        id: string;
        companyId: string;
        rateId: string;
        minWeightGrams: number | null;
        maxWeightGrams: number | null;
        minSubtotal: string | null;
        maxSubtotal: string | null;
        amount: string;
        priority: number;
        createdAt: Date;
    }[]>;
    createTier(user: User, dto: UpsertRateTierDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        priority: number;
        minWeightGrams: number | null;
        maxWeightGrams: number | null;
        rateId: string;
        minSubtotal: string | null;
        maxSubtotal: string | null;
        amount: string;
    }>;
    updateTier(user: User, tierId: string, dto: Partial<UpsertRateTierDto>, ip: string): Promise<{
        id: string;
        companyId: string;
        rateId: string;
        minWeightGrams: number | null;
        maxWeightGrams: number | null;
        minSubtotal: string | null;
        maxSubtotal: string | null;
        amount: string;
        priority: number;
        createdAt: Date;
    }>;
    deleteTier(user: User, tierId: string, ip: string): Promise<{
        ok: boolean;
    }>;
    quote(user: User, dto: QuoteShippingDto): Promise<{
        zone: null;
        rate: null;
        amount: string;
    } | {
        zone: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            storeId: string;
            priority: number;
            description: string | null;
            metadata: Record<string, any> | null;
        };
        rate: null;
        amount: string;
    } | {
        zone: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            storeId: string;
            priority: number;
            description: string | null;
            metadata: Record<string, any> | null;
        };
        rate: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            type: "flat" | "weight" | "price";
            isDefault: boolean;
            priority: number;
            metadata: Record<string, any> | null;
            zoneId: string;
            flatAmount: string | null;
            minOrderSubtotal: string | null;
            maxOrderSubtotal: string | null;
            minWeightGrams: number | null;
            maxWeightGrams: number | null;
            carrierId: string | null;
            carrierServiceCode: string | null;
            carrierServiceName: string | null;
            minDeliveryDays: number | null;
            maxDeliveryDays: number | null;
            calc: "flat" | "weight";
        };
        amount: string;
    }>;
}
