import { PlanFeatureKey } from '../decorator/require-plan-feature.decorator';
type PlanName = 'Free' | 'Starter' | 'Growth' | 'Pro' | 'Custom';
export declare const FEATURE_MIN_PLAN: Record<PlanFeatureKey, PlanName>;
export declare function planHasFeature(planName: string, feature: PlanFeatureKey): boolean;
export {};
