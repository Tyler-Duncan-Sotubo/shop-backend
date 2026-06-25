/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InvoiceTotalsService, LineForCalc } from 'src/domains/billing/invoice/invoice-totals.service';

describe('InvoiceTotalsService', () => {
  let service: InvoiceTotalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceTotalsService],
    }).compile();

    service = module.get<InvoiceTotalsService>(InvoiceTotalsService);
  });

  describe('calcLine', () => {
    it('returns zero tax when taxExempt is true', () => {
      const line: LineForCalc = {
        quantity: 3,
        unitPriceMinor: 2000,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: true },
      };
      const result = service.calcLine(line);
      expect(result).toEqual({ lineNetMinor: 6000, taxMinor: 0, lineTotalMinor: 6000 });
    });

    it('returns zero tax when rateBps is 0', () => {
      const line: LineForCalc = {
        quantity: 2,
        unitPriceMinor: 5000,
        tax: { taxRateBps: 0, taxInclusive: false, taxExempt: false },
      };
      const result = service.calcLine(line);
      expect(result).toEqual({ lineNetMinor: 10000, taxMinor: 0, lineTotalMinor: 10000 });
    });

    it('returns zero tax when rateBps is negative', () => {
      const line: LineForCalc = {
        quantity: 1,
        unitPriceMinor: 3000,
        tax: { taxRateBps: -100, taxInclusive: false, taxExempt: false },
      };
      const result = service.calcLine(line);
      expect(result).toEqual({ lineNetMinor: 3000, taxMinor: 0, lineTotalMinor: 3000 });
    });

    it('calculates exclusive tax correctly (qty=2, unit=5000, rate=750bps)', () => {
      const line: LineForCalc = {
        quantity: 2,
        unitPriceMinor: 5000,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
      };
      const result = service.calcLine(line);
      expect(result).toEqual({ lineNetMinor: 10000, taxMinor: 750, lineTotalMinor: 10750 });
    });

    it('calculates inclusive tax correctly (qty=1, unit=10000, rate=750bps)', () => {
      const line: LineForCalc = {
        quantity: 1,
        unitPriceMinor: 10000,
        tax: { taxRateBps: 750, taxInclusive: true, taxExempt: false },
      };
      const result = service.calcLine(line);
      expect(result).toEqual({ lineNetMinor: 9302, taxMinor: 698, lineTotalMinor: 10000 });
    });

    it('inclusive tax: gross already contains tax so total equals gross', () => {
      const line: LineForCalc = {
        quantity: 2,
        unitPriceMinor: 1000,
        tax: { taxRateBps: 1000, taxInclusive: true, taxExempt: false },
      };
      const result = service.calcLine(line);
      expect(result.lineTotalMinor).toBe(2000);
      expect(result.taxMinor + result.lineNetMinor).toBe(2000);
    });

    it('exclusive tax: net equals gross and total equals gross + tax', () => {
      const line: LineForCalc = {
        quantity: 1,
        unitPriceMinor: 10000,
        tax: { taxRateBps: 2000, taxInclusive: false, taxExempt: false },
      };
      const result = service.calcLine(line);
      expect(result.lineNetMinor).toBe(10000);
      expect(result.taxMinor).toBe(2000);
      expect(result.lineTotalMinor).toBe(12000);
    });

    it('throws BadRequestException when quantity is 0', () => {
      const line: LineForCalc = {
        quantity: 0,
        unitPriceMinor: 5000,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
      };
      expect(() => service.calcLine(line)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when quantity is negative', () => {
      const line: LineForCalc = {
        quantity: -1,
        unitPriceMinor: 5000,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
      };
      expect(() => service.calcLine(line)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when unitPriceMinor is negative', () => {
      const line: LineForCalc = {
        quantity: 1,
        unitPriceMinor: -100,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
      };
      expect(() => service.calcLine(line)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when quantity is not a number', () => {
      const line = {
        quantity: 'two' as any,
        unitPriceMinor: 5000,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
      };
      expect(() => service.calcLine(line)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when unitPriceMinor is not a number', () => {
      const line = {
        quantity: 1,
        unitPriceMinor: NaN,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
      };
      expect(() => service.calcLine(line)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when taxRateBps is not a number', () => {
      const line = {
        quantity: 1,
        unitPriceMinor: 5000,
        tax: { taxRateBps: 'high' as any, taxInclusive: false, taxExempt: false },
      };
      expect(() => service.calcLine(line)).toThrow(BadRequestException);
    });

    it('handles zero unit price with positive quantity', () => {
      const line: LineForCalc = {
        quantity: 5,
        unitPriceMinor: 0,
        tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
      };
      const result = service.calcLine(line);
      expect(result).toEqual({ lineNetMinor: 0, taxMinor: 0, lineTotalMinor: 0 });
    });
  });

  describe('calcInvoice', () => {
    it('sums multiple lines correctly', () => {
      const lines: LineForCalc[] = [
        {
          quantity: 2,
          unitPriceMinor: 5000,
          tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
        },
        {
          quantity: 1,
          unitPriceMinor: 10000,
          tax: { taxRateBps: 750, taxInclusive: true, taxExempt: false },
        },
        {
          quantity: 3,
          unitPriceMinor: 2000,
          tax: { taxRateBps: 0, taxInclusive: false, taxExempt: false },
        },
      ];
      const result = service.calcInvoice(lines);
      expect(result.subtotalMinor).toBe(10000 + 9302 + 6000);
      expect(result.taxMinor).toBe(750 + 698 + 0);
      expect(result.totalMinor).toBe(10750 + 10000 + 6000);
    });

    it('sums a single line correctly', () => {
      const lines: LineForCalc[] = [
        {
          quantity: 2,
          unitPriceMinor: 5000,
          tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
        },
      ];
      const result = service.calcInvoice(lines);
      expect(result).toEqual({ subtotalMinor: 10000, taxMinor: 750, totalMinor: 10750 });
    });

    it('returns all-zero totals for exempt lines', () => {
      const lines: LineForCalc[] = [
        {
          quantity: 1,
          unitPriceMinor: 5000,
          tax: { taxRateBps: 750, taxInclusive: false, taxExempt: true },
        },
        {
          quantity: 2,
          unitPriceMinor: 1000,
          tax: { taxRateBps: 500, taxInclusive: false, taxExempt: true },
        },
      ];
      const result = service.calcInvoice(lines);
      expect(result.taxMinor).toBe(0);
      expect(result.subtotalMinor).toBe(7000);
      expect(result.totalMinor).toBe(7000);
    });

    it('throws BadRequestException when lines array is empty', () => {
      expect(() => service.calcInvoice([])).toThrow(BadRequestException);
    });

    it('throws BadRequestException if any line has invalid quantity', () => {
      const lines: LineForCalc[] = [
        {
          quantity: 1,
          unitPriceMinor: 5000,
          tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
        },
        {
          quantity: 0,
          unitPriceMinor: 3000,
          tax: { taxRateBps: 750, taxInclusive: false, taxExempt: false },
        },
      ];
      expect(() => service.calcInvoice(lines)).toThrow(BadRequestException);
    });
  });
});
