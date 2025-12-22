// src/modules/auth/decorators/api-scopes.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ApiScopes = (...scopes: string[]) =>
  SetMetadata('apiScopes', scopes);
