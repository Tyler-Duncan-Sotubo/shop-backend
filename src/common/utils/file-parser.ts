import { createReadStream } from 'fs';
import { extname } from 'path';
import * as csvParser from 'csv-parser';
import ExcelJS from 'exceljs';

/**
 * Parses a CSV or XLSX file into a JSON array.
 * Throws on unsupported extensions or if maxRows exceeded.
 *
 * Notes:
 * - .xlsx supported via exceljs
 * - .xls NOT supported (convert to .xlsx first if you need it)
 */
export async function parseFile(
  filePath: string,
  originalName: string,
  maxRows: number,
): Promise<Record<string, any>[]> {
  const ext = extname(originalName).toLowerCase();
  const rows: Record<string, any>[] = [];

  if (ext === '.csv') {
    await new Promise<void>((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          rows.push(row);
          if (rows.length > maxRows) {
            reject(new Error(`Maximum ${maxRows} rows exceeded`));
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    return rows;
  }

  if (ext === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    // Use first row as headers (like sheet_to_json)
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const raw = cell.value;
      const header =
        raw === null || raw === undefined
          ? ''
          : String((raw as any)?.text ?? raw).trim();
      headers[colNumber] = header || `column_${colNumber}`;
    });

    // Iterate data rows
    for (let r = 2; r <= worksheet.rowCount; r++) {
      if (rows.length >= maxRows) {
        throw new Error(`Maximum ${maxRows} rows exceeded`);
      }

      const row = worksheet.getRow(r);
      // Skip completely empty rows
      if (row.cellCount === 0) continue;

      const obj: Record<string, any> = {};
      for (let c = 1; c < headers.length; c++) {
        const key = headers[c];
        const cell = row.getCell(c);

        // ExcelJS cell.value can be: null | string | number | boolean | Date | {text...} | {result...} etc.
        const v = cell.value as any;

        let value: any = '';
        if (v === null || v === undefined) value = '';
        else if (v instanceof Date) value = v.toISOString();
        else if (typeof v === 'object') {
          // Handle rich text / hyperlinks / formulas gracefully
          value =
            v.text ??
            v.result ??
            v.hyperlink ??
            (Array.isArray(v.richText)
              ? v.richText.map((t: any) => t.text).join('')
              : undefined) ??
            String(v);
        } else {
          value = v;
        }

        obj[key] = value;
      }

      rows.push(obj);
    }

    return rows;
  }

  if (ext === '.xls') {
    throw new Error(
      'Unsupported file type: .xls is not supported. Please upload .xlsx instead.',
    );
  }

  throw new Error('Unsupported file type');
}
