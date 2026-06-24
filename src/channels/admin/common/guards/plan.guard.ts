import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanySubscriptionsService } from 'src/domains/subscriptions/services/company-subscriptions.service';
import {
  PLAN_FEATURE_KEY,
  PlanFeatureKey,
} from '../decorator/require-plan-feature.decorator';
import { FEATURE_MIN_PLAN, planHasFeature } from './plan-features.map';
import { AuthenticatedRequest } from '../types/custom-request.interface';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptions: CompanySubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlanFeatureKey>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature required — pass through
    if (!feature) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const companyId = request.user?.companyId;
    if (!companyId) throw new ForbiddenException('No company on request.');

    const sub = await this.subscriptions.getWithPlan(companyId);

    if (!sub || !['active', 'trialing'].includes(sub.status)) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_INACTIVE',
        message: 'No active subscription.',
      });
    }

    // Trial gets everything
    if (sub.status === 'trialing') return true;

    const planName = sub.plan?.name;

    if (!planHasFeature(planName, feature)) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT',
        feature,
        currentPlan: planName,
        requiredPlan: FEATURE_MIN_PLAN[feature],
        message: `Your ${planName} plan does not include ${feature}. Upgrade to ${FEATURE_MIN_PLAN[feature]} or higher.`,
      });
    }

    return true;
  }
}
