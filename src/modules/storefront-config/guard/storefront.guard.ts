import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { StoresService } from 'src/modules/commerce/stores/stores.service';

@Injectable()
export class StorefrontGuard implements CanActivate {
  constructor(private readonly storesService: StoresService) {}

  private getHost(req: any): string {
    // Prefer explicitly forwarded host (Next.js / proxy), then fallback to host
    const host =
      req.headers['x-store-host'] ||
      req.headers['x-forwarded-host'] ||
      req.headers['host'] ||
      '';

    return String(host).toLowerCase().split(':')[0].trim();
  }

  // Keeping this for later if you ever want per-domain origin checks,
  // but it's unused in canActivate right now.
  private getOrigin(req: any): string | null {
    const origin = req.headers.origin;
    if (origin && typeof origin === 'string') return origin;

    const referer = req.headers.referer;
    if (referer && typeof referer === 'string') {
      try {
        return new URL(referer).origin;
      } catch {
        return null;
      }
    }

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // 1) Resolve store from domain
    const host = this.getHost(req);
    if (!host) throw new BadRequestException('Missing host');

    /**
     * Expect resolveStoreByHost(host) to return:
     *  - storeId
     *  - companyId
     *  - (optional) domain/isPrimary
     */
    const resolved = await this.storesService.resolveStoreByHost(host);
    if (!resolved) throw new BadRequestException('Unknown store domain');

    // 2) Attach tenant context (source of truth)
    req.storeId = resolved.storeId;
    req.companyId = resolved.companyId;

    // Optional: expose resolved domain info (handy for debugging/logging)
    req.storeDomain = resolved.domain ?? host;
    req.isPrimaryDomain = resolved.isPrimary ?? null;

    return true;
  }
}
