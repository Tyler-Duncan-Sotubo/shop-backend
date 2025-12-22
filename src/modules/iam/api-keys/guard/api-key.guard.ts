// src/modules/auth/guards/api-key.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const rawKey = req.headers['x-api-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException('Missing API key');
    }

    const apiKey = await this.apiKeysService.verifyRawKey(rawKey);
    if (!apiKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    const origin =
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : null);

    if (apiKey.allowedOrigins?.length) {
      if (!origin || !apiKey.allowedOrigins.includes(origin)) {
        throw new ForbiddenException('Origin not allowed for this API key');
      }
    }

    const requiredScopes =
      this.reflector.get<string[]>('apiScopes', context.getHandler()) ?? [];

    if (requiredScopes.length) {
      this.apiKeysService.ensureScope(apiKey, requiredScopes);
    }

    // Attach key context
    req.apiKey = {
      id: apiKey.id,
      scopes: apiKey.scopes ?? [],
      // ✅ expose storeId too (only if your apiKey model has it)
      storeId: apiKey.storeId ?? null,
    };

    // Attach tenant context
    req.companyId = apiKey.companyId;

    // ✅ also expose storeId directly on req for convenience
    if (apiKey.storeId) {
      req.storeId = apiKey.storeId;
    }

    return true;
  }
}
