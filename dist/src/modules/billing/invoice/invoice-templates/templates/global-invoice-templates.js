"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalInvoiceTemplates = void 0;
exports.globalInvoiceTemplates = [
    {
        key: 'classic',
        version: 'v1',
        name: 'Classic Invoice',
        engine: 'handlebars',
        isActive: true,
        isDeprecated: false,
        isDefault: true,
        meta: {
            page: { format: 'A4' },
            margin: { top: '10mm', bottom: '20mm', left: '12mm', right: '12mm' },
        },
        content: `
<div style="display:flex; justify-content:space-between; align-items:flex-start;">
  <div>
    <h2 style="margin:0;">INVOICE</h2>
    <div><strong>No:</strong> {{invoice.number}}</div>
    <div><strong>Date:</strong> {{invoice.issuedAt}}</div>
    {{#if invoice.dueAt}}<div><strong>Due:</strong> {{invoice.dueAt}}</div>{{/if}}
  </div>
  <div style="text-align:right;">
    {{#if branding.logoUrl}}<img src="{{branding.logoUrl}}" style="height:52px;" />{{/if}}
    <div><strong>{{supplier.name}}</strong></div>
    <div style="white-space:pre-line;">{{supplier.address}}</div>
    {{#if supplier.taxId}}<div>Tax ID: {{supplier.taxId}}</div>{{/if}}
  </div>
</div>

<hr />

<div style="display:flex; justify-content:space-between;">
  <div>
    <div style="font-weight:600; margin-bottom:6px;">Bill To</div>
    <div><strong>{{customer.name}}</strong></div>
    <div style="white-space:pre-line;">{{customer.address}}</div>
    {{#if customer.taxId}}<div>Tax ID: {{customer.taxId}}</div>{{/if}}
  </div>

  <div>
    <div style="font-weight:600; margin-bottom:6px;">Payment Details</div>
  {{#if branding.bankDetails}}
  {{#if branding.bankDetails.accountNumber}}
    <div>{{branding.bankDetails.bankName}}</div>
    <div>Acc: {{branding.bankDetails.accountName}}</div>
    <div>No: {{branding.bankDetails.accountNumber}}</div>
  {{/if}}
{{/if}}
  </div>
</div>

<table style="width:100%; border-collapse:collapse; margin-top:16px;">
  <thead>
    <tr>
      <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Item</th>
      <th style="text-align:right; border-bottom:1px solid #ddd; padding:8px;">Qty</th>
      <th style="text-align:right; border-bottom:1px solid #ddd; padding:8px;">Unit</th>
      <th style="text-align:right; border-bottom:1px solid #ddd; padding:8px;">Total</th>
    </tr>
  </thead>
  <tbody>
    {{#each lines}}
      <tr>
        <td style="padding:8px;">{{description}}</td>
        <td style="padding:8px; text-align:right;">{{quantity}}</td>
        <td style="padding:8px; text-align:right;">{{unitPrice}}</td>
        <td style="padding:8px; text-align:right;">{{lineTotal}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>

<div style="display:flex; justify-content:flex-end; margin-top:16px;">
  <table style="min-width:280px;">
    <tr><td>Subtotal</td><td style="text-align:right;">{{totals.subtotal}}</td></tr>
    <tr><td>Tax</td><td style="text-align:right;">{{totals.tax}}</td></tr>
    <tr style="font-weight:700;"><td>Total</td><td style="text-align:right;">{{totals.total}}</td></tr>
    <tr><td>Paid</td><td style="text-align:right;">{{totals.paid}}</td></tr>
    <tr><td>Balance</td><td style="text-align:right;">{{totals.balance}}</td></tr>
  </table>
</div>

{{#if branding.footerNote}}
  <hr />
  <div style="font-size:12px; color:#666;">{{branding.footerNote}}</div>
{{/if}}
    `.trim(),
        css: `
/* optional: keep minimal default styling */
body { font-family: Arial, sans-serif; font-size: 13px; }
table { font-size: 13px; }
    `.trim(),
    },
    {
        key: 'modern',
        version: 'v1',
        name: 'Modern Invoice',
        engine: 'handlebars',
        isActive: true,
        isDeprecated: false,
        isDefault: false,
        meta: {
            page: { format: 'A4' },
            margin: { top: '14mm', bottom: '20mm', left: '14mm', right: '14mm' },
        },
        content: `
<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
  <div>
    {{#if branding.logoUrl}}
      <img src="{{branding.logoUrl}}" style="height:44px; margin-bottom:8px;" />
    {{/if}}
    <div style="font-weight:700; font-size:16px;">{{supplier.name}}</div>
    <div style="white-space:pre-line; color:#555;">{{supplier.address}}</div>
    {{#if supplier.taxId}}<div style="color:#555;">Tax ID: {{supplier.taxId}}</div>{{/if}}
  </div>

  <div style="text-align:right;">
    <div style="font-size:22px; font-weight:700; letter-spacing:1px;">INVOICE</div>
    <div style="margin-top:6px;"><strong>#</strong> {{invoice.number}}</div>
    <div><strong>Issued:</strong> {{invoice.issuedAt}}</div>
    {{#if invoice.dueAt}}<div><strong>Due:</strong> {{invoice.dueAt}}</div>{{/if}}
  </div>
</div>

<div style="display:flex; justify-content:space-between; margin-bottom:24px;">
  <div>
    <div style="font-size:12px; text-transform:uppercase; color:#777; margin-bottom:6px;">Bill To</div>
    <div style="font-weight:600;">{{customer.name}}</div>
    <div style="white-space:pre-line; color:#555;">{{customer.address}}</div>
    {{#if customer.taxId}}<div style="color:#555;">Tax ID: {{customer.taxId}}</div>{{/if}}
  </div>

  {{#if branding.bankDetails.accountNumber}}
  <div style="text-align:right;">
    <div style="font-size:12px; text-transform:uppercase; color:#777; margin-bottom:6px;">Payment</div>
    <div>{{branding.bankDetails.bankName}}</div>
    <div>{{branding.bankDetails.accountName}}</div>
    <div>{{branding.bankDetails.accountNumber}}</div>
  </div>
  {{/if}}
</div>

<table style="width:100%; border-collapse:collapse;">
  <thead>
    <tr style="border-bottom:2px solid #eee;">
      <th style="text-align:left; padding:10px 6px;">Description</th>
      <th style="text-align:right; padding:10px 6px;">Qty</th>
      <th style="text-align:right; padding:10px 6px;">Unit</th>
      <th style="text-align:right; padding:10px 6px;">Amount</th>
    </tr>
  </thead>
  <tbody>
    {{#each lines}}
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 6px;">{{description}}</td>
        <td style="padding:10px 6px; text-align:right;">{{quantity}}</td>
        <td style="padding:10px 6px; text-align:right;">{{unitPrice}}</td>
        <td style="padding:10px 6px; text-align:right;">{{lineTotal}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>

<div style="display:flex; justify-content:flex-end; margin-top:24px;">
  <table style="min-width:260px;">
    <tr>
      <td style="padding:6px 0;">Subtotal</td>
      <td style="padding:6px 0; text-align:right;">{{totals.subtotal}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;">Tax</td>
      <td style="padding:6px 0; text-align:right;">{{totals.tax}}</td>
    </tr>
    <tr style="font-weight:700; font-size:15px;">
      <td style="padding:8px 0;">Total</td>
      <td style="padding:8px 0; text-align:right;">{{totals.total}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;">Paid</td>
      <td style="padding:6px 0; text-align:right;">{{totals.paid}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;">Balance</td>
      <td style="padding:6px 0; text-align:right;">{{totals.balance}}</td>
    </tr>
  </table>
</div>

{{#if branding.footerNote}}
  <div style="margin-top:24px; font-size:12px; color:#666;">
    {{branding.footerNote}}
  </div>
{{/if}}
  `.trim(),
        css: `
body {
  font-family: Inter, Arial, sans-serif;
  font-size: 13px;
  color: #111;
}
table {
  font-size: 13px;
}
  `.trim(),
    },
];
//# sourceMappingURL=global-invoice-templates.js.map