// Run locally when the anonymized source workbooks change. Not part of a cloud build.
// Keep the supplied anonymized cell values unchanged; retain full per-student rows.
const fs = require('node:fs');
const path = require('node:path');
const xlsx = require('xlsx');
require('./prepare-static.cjs');
const { readCourseRows, readFullDataRows } = require('../src/staticDemo/generated/rows');
const root = path.resolve(__dirname, '../..');
function read(file) {
    const wb = xlsx.readFile(file, { dense: true, cellHTML: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const [headers, ...rows] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
    return { headers, rows, objects: xlsx.utils.sheet_to_json(sheet) };
}
const rawProgress = read(process.argv[2] || path.resolve(root, '../anonymous_ptd.xlsx'));
const rawWarehouse = read(process.argv[3] || path.resolve(root, '../anonymous_dw.xlsx'));
const progress = readCourseRows(rawProgress.objects);
const warehouse = readFullDataRows(rawWarehouse.objects);
const years = new Set(require('../public/data/checksheets.json').map(row => Number(row[0])));
const ids = Object.keys(progress).filter(id => {
    const term = progress[id].admitTerm;
    const year = Math.floor(term / 100) - (term % 100 < 9 ? 1 : 0);
    return warehouse[id] && years.has(year);
}).sort((a, b) => Number(a) - Number(b));
if (ids.length < 10) throw new Error('At least ten matching student records with supported checksheets are required.');
function group(source, key) {
    const column = source.headers.indexOf(key);
    if (column < 0) throw new Error(`Missing source identifier column: ${key}`);
    const grouped = new Map();
    for (const row of source.rows) {
        const id = Number(row[column]);
        if (!grouped.has(id)) grouped.set(id, []);
        grouped.get(id).push(row);
    }
    return grouped;
}
const ptdRows = group(rawProgress, 'ID'), dwRows = group(rawWarehouse, 'STUDENT ID');
const records = ids.map(id => ({ id: Number(id), progress: ptdRows.get(Number(id)), warehouse: dwRows.get(Number(id)) }));
const output = path.resolve(__dirname, '../public/data/demo-students');
fs.mkdirSync(output, { recursive: true });
const chunkSize = 25, index = { version: 2, sampleSize: 10, headers: { progress: rawProgress.headers, warehouse: rawWarehouse.headers }, students: [], chunks: [] };
for (let start = 0; start < records.length; start += chunkSize) {
    const chunk = records.slice(start, start + chunkSize), number = index.chunks.length;
    const file = `pool-${String(number).padStart(3, '0')}.json`;
    index.chunks.push(file);
    index.students.push(...chunk.map(student => [student.id, number]));
    fs.writeFileSync(path.join(output, file), JSON.stringify(chunk));
}
fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify(index));
const bytes = index.chunks.reduce((sum, file) => sum + fs.statSync(path.join(output, file)).size, 0);
console.log(`Prepared ${records.length} source students, ${records.reduce((n, r) => n + r.progress.length, 0)} unchanged PTD rows, ${index.chunks.length} chunks, ${(bytes / 1024).toFixed(0)} KB total.`);
