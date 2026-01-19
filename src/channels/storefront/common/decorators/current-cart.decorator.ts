import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCart = createParamDecorator(
  (_data, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.cart;
  },
);
