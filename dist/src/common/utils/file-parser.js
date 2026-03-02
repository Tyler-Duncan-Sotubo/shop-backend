"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFile = parseFile;
const fs_1 = require("fs");
const path_1 = require("path");
const csvParser = require("csv-parser");
const exceljs_1 = require("exceljs");
async function parseFile(filePath, originalName, maxRows) {
    const ext = (0, path_1.extname)(originalName).toLowerCase();
    const rows = [];
    if (ext === '.csv') {
        await new Promise((resolve, reject) => {
            (0, fs_1.createReadStream)(filePath)
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
        const workbook = new exceljs_1.default.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        if (!worksheet)
            return [];
        const headerRow = worksheet.getRow(1);
        const headers = [];
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const raw = cell.value;
            const header = raw === null || raw === undefined
                ? ''
                : String(raw?.text ?? raw).trim();
            headers[colNumber] = header || `column_${colNumber}`;
        });
        for (let r = 2; r <= worksheet.rowCount; r++) {
            if (rows.length >= maxRows) {
                throw new Error(`Maximum ${maxRows} rows exceeded`);
            }
            const row = worksheet.getRow(r);
            if (row.cellCount === 0)
                continue;
            const obj = {};
            for (let c = 1; c < headers.length; c++) {
                const key = headers[c];
                const cell = row.getCell(c);
                const v = cell.value;
                let value = '';
                if (v === null || v === undefined)
                    value = '';
                else if (v instanceof Date)
                    value = v.toISOString();
                else if (typeof v === 'object') {
                    value =
                        v.text ??
                            v.result ??
                            v.hyperlink ??
                            (Array.isArray(v.richText)
                                ? v.richText.map((t) => t.text).join('')
                                : undefined) ??
                            String(v);
                }
                else {
                    value = v;
                }
                obj[key] = value;
            }
            rows.push(obj);
        }
        return rows;
    }
    if (ext === '.xls') {
        throw new Error('Unsupported file type: .xls is not supported. Please upload .xlsx instead.');
    }
    throw new Error('Unsupported file type');
}
//# sourceMappingURL=file-parser.js.map