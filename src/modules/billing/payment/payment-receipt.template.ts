export function paymentReceiptThermalTemplate() {
  // Handlebars template string
  return `
  <div class="rct">
    <div class="center">
      {{#if branding.logoUrl}}
        <img class="logo" src="{{branding.logoUrl}}" alt="logo" />
      {{/if}}
      <div class="title">{{supplier.name}}</div>
      {{#if supplier.address}}<div class="muted">{{supplier.address}}</div>{{/if}}
      {{#if supplier.phone}}<div class="muted">{{supplier.phone}}</div>{{/if}}
      {{#if supplier.email}}<div class="muted">{{supplier.email}}</div>{{/if}}
    </div>

    <div class="hr"></div>

    <div class="row">
      <div class="label">Receipt</div>
      <div class="value strong">{{receipt.receiptNumber}}</div>
    </div>

    <div class="row">
      <div class="label">Date</div>
      <div class="value">{{receipt.issuedAt}}</div>
    </div>

    {{#if receipt.orderNumber}}
      <div class="row">
        <div class="label">Order</div>
        <div class="value">{{receipt.orderNumber}}</div>
      </div>
    {{/if}}

    {{#if receipt.invoiceNumber}}
      <div class="row">
        <div class="label">Invoice</div>
        <div class="value">{{receipt.invoiceNumber}}</div>
      </div>
    {{/if}}

    <div class="hr"></div>

    <div class="row">
      <div class="label">Amount</div>
      <div class="value strong">{{payment.amount}}</div>
    </div>

    <div class="row">
      <div class="label">Method</div>
      <div class="value">{{payment.methodLabel}}</div>
    </div>

    {{#if payment.reference}}
      <div class="row">
        <div class="label">Reference</div>
        <div class="value">{{payment.reference}}</div>
      </div>
    {{/if}}

    {{#if invoice.balance}}
      <div class="hr"></div>

      <div class="row">
        <div class="label">Balance Due</div>
        <div class="value strong">{{invoice.balance}}</div>
      </div>
    {{/if}}

    <div class="hr"></div>

    <div class="center muted">
      {{#if branding.footerNote}}{{branding.footerNote}}{{else}}Thank you.{{/if}}
    </div>
  </div>
  `;
}

export function paymentReceiptThermalCss() {
  return `
  @page { size: 80mm auto; margin: 6mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  .rct { width: 68mm; } /* inside margins */
  .center { text-align: center; }
  .logo { max-width: 40mm; max-height: 18mm; margin: 0 auto 6px auto; display: block; }
  .title { font-weight: 700; font-size: 14px; }
  .muted { color: #555; }
  .strong { font-weight: 700; }
  .hr { border-top: 1px dashed #999; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
  .label { color: #555; flex: 0 0 auto; }
  .value { text-align: right; flex: 1 1 auto; word-break: break-word; }
  `;
}
