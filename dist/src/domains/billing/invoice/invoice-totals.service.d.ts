export type TaxSnapshot = {
    taxId?: string | null;
    taxName?: string | null;
    taxRateBps: number;
    taxInclusive: boolean;
    taxExempt: boolean;
};
export type LineForCalc = {
    quantity: number;
    unitPriceMinor: number;
    tax: TaxSnapshot;
};
export type CalcLineResult = {
    lineNetMinor: number;
    taxMinor: number;
    lineTotalMinor: number;
};
export type CalcInvoiceTotals = {
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
};
export declare class InvoiceTotalsService {
    calcLine(line: LineForCalc): CalcLineResult;
    calcInvoice(lines: LineForCalc[]): CalcInvoiceTotals;
    private roundHalfUp;
    private assertInt;
}
