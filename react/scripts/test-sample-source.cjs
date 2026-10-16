// Local-only verification against the two supplied anonymous workbooks.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const base = path.resolve(__dirname, '../public/data/demo-students');
const index = require(path.join(base, 'index.json'));
function source(file, idHeader) {
    const book = xlsx.readFile(path.resolve(__dirname, '../../..', file), {dense: true});
    const [headers, ...rows] = xlsx.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {header: 1, defval: null, blankrows: false});
    const column = headers.indexOf(idHeader), grouped = new Map();
    for (const row of rows) {
        const id = Number(row[column]);
        if (!grouped.has(id)) grouped.set(id, []);
        grouped.get(id).push(row);
    }
    return {headers, grouped};
}
const progress = source('anonymous_ptd.xlsx', 'ID');
const warehouse = source('anonymous_dw.xlsx', 'STUDENT ID');
assert.deepEqual(index.headers.progress, progress.headers);
assert.deepEqual(index.headers.warehouse, warehouse.headers);
const seen = new Set();
let courseRows = 0;
for (const file of index.chunks) {
    for (const record of JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'))) {
        assert.ok(!seen.has(record.id));
        seen.add(record.id);
        assert.deepEqual(record.progress, progress.grouped.get(record.id), `All PTD cells for ${record.id} must remain unchanged`);
        assert.deepEqual(record.warehouse, warehouse.grouped.get(record.id), `All DW cells for ${record.id} must remain unchanged`);
        courseRows += record.progress.length;
    }
}
assert.equal(seen.size, index.students.length);
console.log(`PASS: ${seen.size} original student IDs, ${courseRows} complete PTD rows, all DW rows and all header/cell values match the supplied workbooks exactly.`);
