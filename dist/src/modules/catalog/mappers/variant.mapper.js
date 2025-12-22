"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapVariantToResponse = mapVariantToResponse;
exports.mapVariantToResponseWithImage = mapVariantToResponseWithImage;
const pricing_1 = require("../utils/pricing");
function mapVariantToResponse(row) {
    return {
        id: row.id,
        variantId: row.varId,
        productId: row.productId,
        title: row.title,
        sku: row.sku,
        barcode: row.barcode,
        option1: row.option1,
        option2: row.option2,
        option3: row.option3,
        isActive: row.isActive,
        regularPrice: Number(row.regularPrice),
        salePrice: row.salePrice ? Number(row.salePrice) : null,
        effectivePrice: (0, pricing_1.getEffectivePrice)({
            regularPrice: row.regularPrice,
            salePrice: row.salePrice,
            saleStartAt: null,
            saleEndAt: null,
        }),
        currency: row.currency,
        weight: row.weight ? Number(row.weight) : null,
        length: row.length ? Number(row.length) : null,
        width: row.width ? Number(row.width) : null,
        height: row.height ? Number(row.height) : null,
        metadata: row.metadata ?? {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
function mapVariantToResponseWithImage(row, image, inventory) {
    return {
        ...mapVariantToResponse(row),
        image,
        inventory,
    };
}
//# sourceMappingURL=variant.mapper.js.map