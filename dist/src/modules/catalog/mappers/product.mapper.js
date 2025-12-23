"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapProductToDetailResponse = mapProductToDetailResponse;
exports.mapProductsListToStorefront = mapProductsListToStorefront;
exports.mapProductToCollectionListResponse = mapProductToCollectionListResponse;
const pricing_1 = require("../utils/pricing");
function buildPermalink(slug) {
    return `/products/${slug}`;
}
function formatNaira(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .format(amount)
        .replace('NGN', '₦');
}
function buildPriceHtmlRange(min, max) {
    if (!Number.isFinite(min))
        min = 0;
    if (!Number.isFinite(max))
        max = 0;
    const minF = formatNaira(min);
    const maxF = formatNaira(max);
    if (min === max)
        return minF;
    return `${minF} – ${maxF}`;
}
function getVariantEffectivePrice(v) {
    const effective = (0, pricing_1.getEffectivePrice)({
        regularPrice: v.regularPrice,
        salePrice: v.salePrice,
        saleStartAt: v.saleStartAt ?? null,
        saleEndAt: v.saleEndAt ?? null,
    });
    return Number(effective ?? 0);
}
function getVariantRegularPrice(v) {
    return Number(v.regularPrice ?? 0);
}
function getVariantSalePrice(v) {
    return v.salePrice != null ? Number(v.salePrice) : null;
}
function computeMinMaxPrices(activeVariants) {
    if (!activeVariants.length)
        return { min: 0, max: 0 };
    let min = Infinity;
    let max = -Infinity;
    for (const v of activeVariants) {
        const p = getVariantEffectivePrice(v);
        if (p < min)
            min = p;
        if (p > max)
            max = p;
    }
    if (!Number.isFinite(min))
        min = 0;
    if (!Number.isFinite(max))
        max = 0;
    return { min, max };
}
function mapProductAttributes(product) {
    const opts = (product.options ?? [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return opts.map((opt, idx) => ({
        id: 0,
        name: opt.name,
        slug: opt.name,
        position: idx,
        visible: true,
        variation: true,
        options: (opt.values ?? []).map((v) => v.value),
    }));
}
function recordToMetaData(record) {
    if (!record || typeof record !== 'object')
        return [];
    return Object.entries(record).map(([key, value]) => ({
        key,
        value,
    }));
}
function buildProductMetaData(product) {
    const seoTitle = product.seoTitle ?? null;
    const seoDescription = product.seoDescription ?? null;
    const metadataObj = product.metadata ?? {};
    return [
        { key: 'seo_title', value: seoTitle },
        { key: 'seo_description', value: seoDescription },
        ...recordToMetaData(metadataObj),
    ];
}
function buildVariantMetaData(variant) {
    const metadataObj = variant.metadata ?? {};
    return recordToMetaData(metadataObj);
}
function mapVariantToWooLike(variant, product) {
    const effective = getVariantEffectivePrice(variant);
    const regular = getVariantRegularPrice(variant);
    const sale = getVariantSalePrice(variant);
    const opts = (product.options ?? [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const attributes = [];
    if (variant.option1) {
        attributes.push({
            id: 0,
            name: opts[0]?.name ?? 'Option 1',
            option: variant.option1,
        });
    }
    if (variant.option2) {
        attributes.push({
            id: 0,
            name: opts[1]?.name ?? 'Option 2',
            option: variant.option2,
        });
    }
    if (variant.option3) {
        attributes.push({
            id: 0,
            name: opts[2]?.name ?? 'Option 3',
            option: variant.option3,
        });
    }
    const img = variant.image ?? null;
    const image = img
        ? { id: img.id, src: img.url, alt: img.altText ?? null }
        : null;
    const manage_stock = false;
    const stock_quantity = null;
    const stock_status = effective > 0 ? 'instock' : 'outofstock';
    return {
        id: variant.id,
        price: String(effective),
        regular_price: String(regular),
        sale_price: sale != null ? String(sale) : '',
        on_sale: sale != null && sale < regular,
        manage_stock,
        stock_quantity,
        stock_status,
        weight: variant.weight != null ? String(variant.weight) : '',
        image,
        attributes,
        meta_data: buildVariantMetaData(variant),
    };
}
function mapProductToDetailResponse(product) {
    const hero = product.defaultImage ??
        (product.images && product.images.length ? product.images[0] : null);
    const images = hero
        ? [{ id: hero.id, src: hero.url, alt: hero.altText ?? null }]
        : [];
    const rawCats = (product.productCategories ?? [])
        .map((pc) => pc.category)
        .filter(Boolean);
    const byId = new Map(rawCats.map((c) => [c.id, c]));
    const uniqueCats = Array.from(byId.values());
    let orderedCats = uniqueCats;
    const childWithParent = uniqueCats.find((c) => c.parentId && byId.has(c.parentId));
    if (childWithParent?.parentId) {
        const parent = byId.get(childWithParent.parentId);
        const child = childWithParent;
        orderedCats = [
            parent,
            child,
            ...uniqueCats.filter((c) => c.id !== parent.id && c.id !== child.id),
        ];
    }
    const categories = orderedCats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
    }));
    const attributes = mapProductAttributes(product);
    const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
    const isVariable = attributes.some((a) => a.variation) && activeVariants.length > 0;
    const pricedVariants = activeVariants.filter((v) => getVariantEffectivePrice(v) > 0);
    const pricingBase = pricedVariants.length ? pricedVariants : activeVariants;
    const { min, max } = computeMinMaxPrices(pricingBase);
    const variations = activeVariants.map((v) => mapVariantToWooLike(v, product));
    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        permalink: buildPermalink(product.slug),
        type: isVariable ? 'variable' : 'simple',
        price: String(min),
        regular_price: isVariable ? '' : String(min),
        sale_price: '',
        on_sale: false,
        average_rating: Number(product.average_rating ?? 0).toFixed(2),
        rating_count: Number(product.rating_count ?? 0),
        images,
        tags: [],
        categories,
        attributes,
        description: product.description ?? '',
        short_description: '',
        variations,
        manage_stock: false,
        stock_quantity: null,
        weight: '',
        stock_status: 'instock',
        price_html: buildPriceHtmlRange(min, max),
        meta_data: buildProductMetaData(product),
    };
}
function mapProductsListToStorefront(rows) {
    const rangeLabel = (min, max) => {
        if (min == null && max == null)
            return '';
        if (min != null && max != null)
            return min === max ? `${min}` : `${min} - ${max}`;
        return `${min ?? max}`;
    };
    return rows.map((p) => {
        const regularMin = p.minPrice ?? 0;
        const saleMin = p.minSalePrice ?? null;
        const saleMax = p.maxSalePrice ?? p.minSalePrice ?? null;
        const onSale = saleMin != null && saleMin > 0 && regularMin > 0 && saleMin < regularMin;
        const regularLabel = rangeLabel(p.minPrice, p.maxPrice);
        const saleLabel = rangeLabel(saleMin, saleMax);
        const price_html = onSale && regularLabel && saleLabel
            ? `<del>${regularLabel}</del> <ins>${saleLabel}</ins>`
            : regularLabel;
        const current = onSale ? saleMin : regularMin;
        return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            permalink: buildPermalink(p.slug),
            price: String(current),
            regular_price: String(regularMin),
            sale_price: onSale ? String(saleMin) : null,
            on_sale: onSale,
            price_html,
            average_rating: (p.averageRating ?? 0).toFixed(2),
            rating_count: p.ratingCount ?? 0,
            images: p.imageUrl ? [{ src: p.imageUrl, alt: p.name }] : [],
            tags: (p.categories ?? [])
                .slice(0, 1)
                .map((c) => ({ name: c.name, slug: c.id })),
        };
    });
}
function mapProductToCollectionListResponse(product) {
    const hero = product.defaultImage ??
        (product.images && product.images.length ? product.images[0] : null);
    const images = hero
        ? [{ id: hero.id, src: hero.url, alt: hero.altText ?? null }]
        : [];
    const categories = (product.productCategories ?? [])
        .filter((pc) => pc.category)
        .map((pc) => ({
        id: pc.category.id,
        name: pc.category.name,
        slug: pc.category.slug,
    }));
    const attributes = mapProductAttributes(product);
    const min = Number(product.minPrice ?? 0);
    const max = Number(product.maxPrice ?? min);
    const isVariable = attributes.some((a) => a.variation);
    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        permalink: buildPermalink(product.slug),
        type: isVariable ? 'variable' : 'simple',
        price: String(min),
        regular_price: isVariable ? '' : String(min),
        sale_price: '',
        on_sale: false,
        average_rating: Number(product.average_rating ?? 0).toFixed(2),
        rating_count: Number(product.rating_count ?? 0),
        images,
        tags: [],
        categories,
        attributes,
        price_html: buildPriceHtmlRange(min, max),
    };
}
//# sourceMappingURL=product.mapper.js.map