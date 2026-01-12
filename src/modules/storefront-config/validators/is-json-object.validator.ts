// src/common/validators/is-json-object.validator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsJsonObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isJsonObject',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined) return true; // optional
          if (value === null) return false;
          return typeof value === 'object' && !Array.isArray(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a JSON object`;
        },
      },
    });
  };
}
