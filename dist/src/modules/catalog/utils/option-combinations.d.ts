export interface OptionValueInput {
    id: string;
    value: string;
}
export interface ProductOptionWithValues {
    id: string;
    name: string;
    position: number;
    values: OptionValueInput[];
}
export interface VariantCombination {
    option1?: string;
    option2?: string;
    option3?: string;
    option1ValueId?: string;
    option2ValueId?: string;
    option3ValueId?: string;
    title: string;
    optionValueMap: Record<string, string>;
}
export declare function generateVariantCombinations(options: ProductOptionWithValues[]): VariantCombination[];
export declare function buildVariantTitle(optionTexts: string[]): string;
