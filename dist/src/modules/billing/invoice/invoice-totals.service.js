"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceTotalsService = void 0;
const common_1 = require("@nestjs/common");
let InvoiceTotalsService = class InvoiceTotalsService {
    calcLine(line) {
        const qty = this.assertInt(line.quantity, 'quantity');
        const unit = this.assertInt(line.unitPriceMinor, 'unitPriceMinor');
        if (qty <= 0)
            throw new common_1.BadRequestException('Line quantity must be > 0');
        if (unit < 0)
            throw new common_1.BadRequestException('Unit price cannot be negative');
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
        if (!inclusive) {
            const tax = this.roundHalfUp((gross * rateBps) / 10000);
            return {
                lineNetMinor: gross,
                taxMinor: tax,
                lineTotalMinor: gross + tax,
            };
        }
        const tax = this.roundHalfUp((gross * rateBps) / (10000 + rateBps));
        return {
            lineNetMinor: gross - tax,
            taxMinor: tax,
            lineTotalMinor: gross,
        };
    }
    calcInvoice(lines) {
        if (!lines.length)
            throw new common_1.BadRequestException('Invoice must have at least one line');
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
    roundHalfUp(x) {
        return Math.round(x);
    }
    assertInt(n, name) {
        if (typeof n !== 'number' || !Number.isFinite(n)) {
            throw new common_1.BadRequestException(`${name} must be a number`);
        }
        return Math.trunc(n);
    }
};
exports.InvoiceTotalsService = InvoiceTotalsService;
exports.InvoiceTotalsService = InvoiceTotalsService = __decorate([
    (0, common_1.Injectable)()
], InvoiceTotalsService);
//# sourceMappingURL=invoice-totals.service.js.map