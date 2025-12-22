import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum OnboardingStep {
  STORE_SETUP = 'store_setup_complete',
  LOCATION_SETUP = 'location_setup_complete',
  PAYMENT_SETUP = 'payment_setup_complete',
  BRANDING = 'branding_complete',
}

export class MarkOnboardingStepDto {
  @IsEnum(OnboardingStep)
  step: OnboardingStep;

  @IsOptional()
  @IsBoolean()
  value?: boolean = true;
}
