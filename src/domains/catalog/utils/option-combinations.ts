/**
 * A single option value (e.g. "Red", "M").
 * These typically come from product_option_values.
 */
export interface OptionValueInput {
  id: string;
  value: string;
}

/**
 * A product option with its possible values.
 * Example: { id: "size", name: "Size", position: 1, values: [...] }
 */
export interface ProductOptionWithValues {
  id: string;
  name: string; // "Size", "Color", etc.
  position: number; // 1, 2, 3
  values: OptionValueInput[];
}

/**
 * Result of a generated variant combination.
 *
 * This is intentionally close to your product_variants schema:
 *  - option1/2/3 => text value that will be stored on the variant
 *  - option1ValueId/2/3 => the underlying value id (useful for UI / diffing)
 *  - title => human-friendly label like "Red / M"
 */
export interface VariantCombination {
  option1?: string;
  option2?: string;
  option3?: string;

  option1ValueId?: string;
  option2ValueId?: string;
  option3ValueId?: string;

  title: string;

  // Optional: keep some context if needed
  // mapping of optionId -> valueId
  optionValueMap: Record<string, string>;
}

/**
 * Generate all variant combinations (Cartesian product) from a set of
 * product options and their values.
 *
 * - Options are sorted by `position` ascending (1, 2, 3).
 * - Handles 0, 1, 2, or 3 options gracefully.
 */
export function generateVariantCombinations(
  options: ProductOptionWithValues[],
): VariantCombination[] {
  if (!options || options.length === 0) {
    return [];
  }

  // Ensure deterministic order: position 1 -> 2 -> 3
  const sorted = [...options]
    .filter((opt) => opt.values && opt.values.length > 0)
    .sort((a, b) => a.position - b.position);

  if (sorted.length === 0) {
    return [];
  }

  // Start with a single "empty" combination and build up
  type PartialCombination = {
    optionValues: {
      option: ProductOptionWithValues;
      value: OptionValueInput;
    }[];
  };

  let combinations: PartialCombination[] = [{ optionValues: [] }];

  for (const option of sorted) {
    const next: PartialCombination[] = [];

    for (const combo of combinations) {
      for (const value of option.values) {
        next.push({
          optionValues: [...combo.optionValues, { option, value }],
        });
      }
    }

    combinations = next;
  }

  // Map partial combinations -> VariantCombination structure
  return combinations.map((combo) => {
    // Sort again by position to be safe
    const ordered = [...combo.optionValues].sort(
      (a, b) => a.option.position - b.option.position,
    );

    const optionValueMap: Record<string, string> = {};
    const optionTexts: string[] = [];

    const variant: VariantCombination = {
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

      const slot = index + 1; // 1,2,3

      if (slot === 1) {
        variant.option1 = value.value;
        variant.option1ValueId = value.id;
      } else if (slot === 2) {
        variant.option2 = value.value;
        variant.option2ValueId = value.id;
      } else if (slot === 3) {
        variant.option3 = value.value;
        variant.option3ValueId = value.id;
      }
    });

    variant.title = buildVariantTitle(optionTexts);

    return variant;
  });
}

/**
 * Build a human-friendly variant title from the list of option value texts.
 * e.g. ["Red", "M"] -> "Red / M"
 */
export function buildVariantTitle(optionTexts: string[]): string {
  return optionTexts.filter(Boolean).join(' / ');
}
