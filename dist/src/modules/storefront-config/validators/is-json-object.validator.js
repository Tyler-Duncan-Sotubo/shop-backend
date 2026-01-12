"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsJsonObject = IsJsonObject;
const class_validator_1 = require("class-validator");
function IsJsonObject(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isJsonObject',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value) {
                    if (value === undefined)
                        return true;
                    if (value === null)
                        return false;
                    return typeof value === 'object' && !Array.isArray(value);
                },
                defaultMessage(args) {
                    return `${args.property} must be a JSON object`;
                },
            },
        });
    };
}
//# sourceMappingURL=is-json-object.validator.js.map