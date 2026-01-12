export declare enum OnboardingStep {
    PAYMENT_SETUP = "payment_setup_complete",
    ONLINE_STORE_CUSTOMIZATION = "online_store_customization_complete",
    SHIPPING_SETUP = "shipping_setup_complete",
    PRODUCTS_ADDED = "products_added_complete",
    CHECKOUT_REVIEW = "checkout_review_complete",
    TAX_REVIEW = "tax_review_complete",
    TEAM_INVITE = "team_invite_complete"
}
export declare class MarkOnboardingStepDto {
    step: OnboardingStep;
    value?: boolean;
}
