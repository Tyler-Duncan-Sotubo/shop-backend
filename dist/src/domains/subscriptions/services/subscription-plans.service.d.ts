import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { PlanFeatures } from "../../../infrastructure/drizzle/schema";
export declare class SubscriptionPlansService {
    private readonly db;
    private readonly logger;
    constructor(db: db);
    getAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        monthlyPriceNGN: number;
        annualPriceNGN: number;
        monthlyCredits: number;
        features: PlanFeatures;
        paystackMonthlyPlanCode: string | null;
        paystackAnnualPlanCode: string | null;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    getById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        monthlyPriceNGN: number;
        annualPriceNGN: number;
        monthlyCredits: number;
        features: PlanFeatures;
        paystackMonthlyPlanCode: string | null;
        paystackAnnualPlanCode: string | null;
        isActive: boolean;
        sortOrder: number;
    }>;
    getByName(name: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        monthlyPriceNGN: number;
        annualPriceNGN: number;
        monthlyCredits: number;
        features: PlanFeatures;
        paystackMonthlyPlanCode: string | null;
        paystackAnnualPlanCode: string | null;
        isActive: boolean;
        sortOrder: number;
    }>;
    getFreePlan(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        monthlyPriceNGN: number;
        annualPriceNGN: number;
        monthlyCredits: number;
        features: PlanFeatures;
        paystackMonthlyPlanCode: string | null;
        paystackAnnualPlanCode: string | null;
        isActive: boolean;
        sortOrder: number;
    }>;
}
