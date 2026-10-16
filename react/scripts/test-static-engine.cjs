// Compare the browser engine with the canonical Node engine against a local test DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const engine = require('../src/staticDemo/engine');
const rules = require('../public/data/checksheets.json');
const { DB } = require('../../node/database/handler');
const original = require('../../node/parser/parser');
const spreadsheet = require('../../node/parser/spreadsheet');
(async () => {
    assert.ok(await DB.init(1), 'Local test database must be available');
    try {
        const progressPath = path.resolve(root, '../anonymous_ptd.xlsx');
        const warehousePath = path.resolve(root, '../anonymous_dw.xlsx');
        const progress = fs.readFileSync(progressPath);
        const warehouse = fs.readFileSync(warehousePath);
        const old = await original.analyzeStudents(spreadsheet.readCourseExcelFile(progressPath), spreadsheet.readFullDataExcelFile(warehousePath));
        const additional = new Map(old.additional.map(row => [Number(row.student_id), row]));
        const expected = old.students.map(student => {
            const { student_id, ...details } = additional.get(Number(student.id)) || {};
            return { ...student, ...details };
        });
        const actual = await engine.analyze(progress, warehouse, rules);
        assert.deepEqual(actual, expected);
        assert.equal(actual.length, 1619);
        const xlsx = require('xlsx');
        const book = xlsx.read(engine.exportRows(actual), { type: 'array' });
        assert.equal(xlsx.utils.sheet_to_json(book.Sheets['Full Analysis']).length, 1619);
        const filtered = await engine.analyze(engine.sample('progress'), engine.sample('warehouse'), rules, { advisor_lname: 'DoesNotExist' });
        assert.equal(filtered.length, 0);
        await assert.rejects(engine.analyze(new Uint8Array([1, 2]), new Uint8Array([3, 4]), rules));
        console.log('PASS: browser and backend results match exactly for 1,619 students; export, sample, filters, and invalid input verified.');
        console.log('Process memory after both engines (MB):', Math.round(process.memoryUsage().rss / 1024 / 1024));
    } finally { DB.end(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
