import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentStoreId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return (req.storeId ?? req.apiKey?.storeId ?? null) as string | null;
  },
);
