import { Injectable, BadRequestException } from '@nestjs/common';

export type TaxSnapshot = {
  taxId?: string | null;
  taxName?: string | null;
  taxRateBps: number; // 750 = 7.5%
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

@Injectable()
export class InvoiceTotalsService {
  /**
   * Robust minor-unit math with banker-safe rounding.
   * rateBps = basis points (1% = 100 bps)
   */
  calcLine(line: LineForCalc): CalcLineResult {
    const qty = this.assertInt(line.quantity, 'quantity');
    const unit = this.assertInt(line.unitPriceMinor, 'unitPriceMinor');

    if (qty <= 0) throw new BadRequestException('Line quantity must be > 0');
    if (unit < 0)
      throw new BadRequestException('Unit price cannot be negative');

    const rateBps = this.assertInt(line.tax.taxRateBps, 'taxRateBps');
    const inclusive = !!line.tax.taxInclusive;
    const exempt = !!line.tax.taxExempt;

    const gross = qty * unit;

    if (exempt || rateBps <= 0) {
      return {
        lineNetMinor: gross,
        taxMinor: 0,
        lineTotalMinor: gross,
      };
    }

    // Convert bps → fraction: rateBps / 10000
    if (!inclusive) {
      const tax = this.roundHalfUp((gross * rateBps) / 10000);
      return {
        lineNetMinor: gross,
        taxMinor: tax,
        lineTotalMinor: gross + tax,
      };
    }

    // Inclusive tax: gross already includes tax
    // tax = gross * rate / (1 + rate)  => gross * rateBps / (10000 + rateBps)
    const tax = this.roundHalfUp((gross * rateBps) / (10000 + rateBps));
    return {
      lineNetMinor: gross - tax,
      taxMinor: tax,
      lineTotalMinor: gross,
    };
  }

  calcInvoice(lines: LineForCalc[]): CalcInvoiceTotals {
    if (!lines.length)
      throw new BadRequestException('Invoice must have at least one line');

    let subtotal = 0;
    let tax = 0;
    let total = 0;

    for (const l of lines) {
      const r = this.calcLine(l);
      subtotal += r.lineNetMinor;
      tax += r.taxMinor;
      total += r.lineTotalMinor;
    }

    return {
      subtotalMinor: subtotal,
      taxMinor: tax,
      totalMinor: total,
    };
  }

  private roundHalfUp(x: number): number {
    // safe for typical invoice arithmetic
    return Math.round(x);
  }

  private assertInt(n: any, name: string): number {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new BadRequestException(`${name} must be a number`);
    }
    // you store minor units as integers; enforce that:
    return Math.trunc(n);
  }
}
