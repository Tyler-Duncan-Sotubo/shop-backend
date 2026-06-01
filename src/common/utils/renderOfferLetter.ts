// src/utils/renderOfferLetter.ts
import Handlebars from 'handlebars';

export function renderOfferLetter(template: string, data: Record<string, any>) {
  const compiled = Handlebars.compile(template);
  return compiled(data);
}

export function wrapInHtml(content: string, css?: string) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: 'Helvetica', sans-serif;
          font-size: 12pt;
          padding: 2px;
          line-height: 1.6;
          color: #000;
        }

        h1, h2, h3 {
          margin-top: 20px;
        }

        /* ✅ Remove global table borders — invoice templates handle their own */
        table {
          border-collapse: collapse;
        }

        th, td {
          padding: 8px 16px;
          text-align: left;
        }

        .signature {
          margin-top: 50px;
        }

        hr {
          margin: 40px 0;
          border: none;
          border-top: 1px solid #eee;
        }

        /* ✅ TipTap rich text styles — for footer notes and any HTML content */
        ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }

        ol {
          list-style: decimal;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }

        li {
          margin: 0.2rem 0;
        }

        p {
          margin: 0.4rem 0;
        }

        strong {
          font-weight: 700;
        }

        em {
          font-style: italic;
        }

        a {
          color: #2563eb;
          text-decoration: underline;
        }

        blockquote {
          border-left: 3px solid #ddd;
          padding-left: 0.75rem;
          margin: 0.75rem 0;
          color: #555;
        }

        /* ───────── Template-specific CSS ───────── */
        ${css ?? ''}
      </style>
    </head>
    <body>
      ${content}
    </body>
  </html>
  `;
}
