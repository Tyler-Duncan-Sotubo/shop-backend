"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPath = hasPath;
function hasPath(obj, path) {
    if (!obj || !path)
        return false;
    return path.split('.').every((key) => {
        if (obj == null || typeof obj !== 'object')
            return false;
        obj = obj[key];
        return obj !== undefined;
    });
}
//# sourceMappingURL=hasPath.js.map