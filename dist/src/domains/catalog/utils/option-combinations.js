"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVariantCombinations = generateVariantCombinations;
exports.buildVariantTitle = buildVariantTitle;
function generateVariantCombinations(options) {
    if (!options || options.length === 0) {
        return [];
    }
    const sorted = [...options]
        .filter((opt) => opt.values && opt.values.length > 0)
        .sort((a, b) => a.position - b.position);
    if (sorted.length === 0) {
        return [];
    }
    let combinations = [{ optionValues: [] }];
    for (const option of sorted) {
        const next = [];
        for (const combo of combinations) {
            for (const value of option.values) {
                next.push({
                    optionValues: [...combo.optionValues, { option, value }],
                });
            }
        }
        combinations = next;
    }
    return combinations.map((combo) => {
        const ordered = [...combo.optionValues].sort((a, b) => a.option.position - b.option.position);
        const optionValueMap = {};
        const optionTexts = [];
        const variant = {
            option1: undefined,
            option2: undefined,
            option3: undefined,
            option1ValueId: undefined,
            option2ValueId: undefined,
            option3ValueId: undefined,
            title: '',
            optionValueMap,
        };
        ordered.forEach(({ option, value }, index) => {
            optionValueMap[option.id] = value.id;
            optionTexts.push(value.value);
            const slot = index + 1;
            if (slot === 1) {
                variant.option1 = value.value;
                variant.option1ValueId = value.id;
            }
            else if (slot === 2) {
                variant.option2 = value.value;
                variant.option2ValueId = value.id;
            }
            else if (slot === 3) {
                variant.option3 = value.value;
                variant.option3ValueId = value.id;
            }
        });
        variant.title = buildVariantTitle(optionTexts);
        return variant;
    });
}
function buildVariantTitle(optionTexts) {
    return optionTexts.filter(Boolean).join(' / ');
}
//# sourceMappingURL=option-combinations.js.map