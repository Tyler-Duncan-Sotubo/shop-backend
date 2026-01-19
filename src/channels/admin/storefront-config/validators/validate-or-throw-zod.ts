// src/modules/storefront-config/validators/validate-or-throw-zod.ts
import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';

export function validateOrThrowZod(err: unknown, tag = 'validation') {
  if (err instanceof ZodError) {
    throw new BadRequestException({
      message: 'Invalid configuration',
      tag,
      issues: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      })),
    });
  }
  throw new BadRequestException({ message: 'Invalid configuration', tag });
}
