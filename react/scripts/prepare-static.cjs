// Reuse the canonical backend algorithm without bundling MySQL or filesystem APIs.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'react/src/staticDemo/generated');
fs.mkdirSync(output, { recursive: true });
let parser = fs.readFileSync(path.join(root, 'node/parser/parser.js'), 'utf8').replace(/\r\n/g, '\n');
parser = parser.replace('const typedefs = require("../helpers/typedefs");', '')
    .replace('require("../database/utils/Checksheet")', 'require("../rules")');
if (parser.includes('require("../database')) throw new Error('Unexpected parser dependency');
fs.writeFileSync(path.join(output, 'parser.js'), parser);
fs.copyFileSync(path.join(root, 'node/parser/lookup.js'), path.join(output, 'lookup.js'));
let rows = fs.readFileSync(path.join(root, 'node/parser/spreadsheet.js'), 'utf8').replace(/\r\n/g, '\n');
rows = rows.slice(rows.indexOf('// Small helpers'), rows.indexOf('/**\n * Minimal,'));
if (!rows || rows.includes('writeFile')) throw new Error('Unexpected spreadsheet source layout');
rows = rows.replace(/function readCourseExcelFile\(filePath\)/, 'function readCourseRows(rows)')
    .replace(/function readFullDataExcelFile\(filePath\)/, 'function readFullDataRows(rows)')
    .replace(/    const wb = xlsx\.readFile\(filePath\);\r?\n    const ws = wb\.Sheets\[wb\.SheetNames\[0\]\];\r?\n    const rows = xlsx\.utils\.sheet_to_json\(ws\);/g, '');
if (rows.includes('xlsx.') || rows.includes('filePath')) throw new Error('Unexpected filesystem dependency');
fs.writeFileSync(path.join(output, 'rows.js'), rows + '\nmodule.exports = {readCourseRows, readFullDataRows};\n');
console.log('Prepared browser audit engine from backend sources.');
