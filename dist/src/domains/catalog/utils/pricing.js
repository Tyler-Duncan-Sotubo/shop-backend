"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSaleActive = isSaleActive;
exports.getEffectivePrice = getEffectivePrice;
function isSaleActive(variant) {
    if (!variant.salePrice)
        return false;
    if (!variant.regularPrice)
        return false;
    const salePrice = Number(variant.salePrice);
    const regularPrice = Number(variant.regularPrice);
    if (salePrice >= regularPrice)
        return false;
    const now = new Date();
    if (variant.saleStartAt && now < variant.saleStartAt) {
        return false;
    }
    if (variant.saleEndAt && now > variant.saleEndAt) {
        return false;
    }
    return true;
}
function getEffectivePrice(variant) {
    if (isSaleActive(variant)) {
        return Number(variant.salePrice);
    }
    return Number(variant.regularPrice ?? 0);
}
//# sourceMappingURL=pricing.js.map