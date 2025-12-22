export declare enum OnboardingStep {
    STORE_SETUP = "store_setup_complete",
    LOCATION_SETUP = "location_setup_complete",
    PAYMENT_SETUP = "payment_setup_complete",
    BRANDING = "branding_complete"
}
export declare class MarkOnboardingStepDto {
    step: OnboardingStep;
    value?: boolean;
}
