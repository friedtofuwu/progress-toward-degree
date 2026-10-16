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
const sampleIndex = require('../public/data/demo-students/index.json');
const sampleRecords = require('../public/data/demo-students/pool-000.json').slice(0, 10);
const selection = {records: sampleRecords, headers: sampleIndex.headers};
(async () => {
    assert.ok(await DB.init(1), 'Local test database must be available');
    try {
        const progressPath = path.resolve(root, '../anonymous_ptd.xlsx');
        const warehousePath = path.resolve(root, '../anonymous_dw.xlsx');
        const progress = fs.readFileSync(progressPath);
        const warehouse = fs.readFileSync(warehousePath);
        const old = await original.analyzeStudents(spreadsheet.readCourseExcelFile(progressPath), spreadsheet.readFullDataExcelFile(warehousePath));
        const additional = new Map(old.additional.map(row => [Number(row.id), row]));
        const expected = old.students.map(student => {
            const { id, email_address, ...details } = additional.get(Number(student.id));
            return { ...student, ...details, email: email_address };
        });
        const actual = await engine.analyze(progress, warehouse, rules);
        assert.deepEqual(actual, expected);
        assert.equal(actual.length, 1619);
        assert.ok(actual.every(row => typeof row.graduation_ready === 'boolean'));
        assert.ok(actual.every(row => Array.isArray(row.missing_courses)));
        assert.ok(actual.some(row => row.missing_courses.length > 0));
        assert.ok(actual.every(row => Object.hasOwn(row, 'email')));
        const xlsx = require('xlsx');
        const book = xlsx.read(engine.exportRows(actual), { type: 'array' });
        assert.equal(xlsx.utils.sheet_to_json(book.Sheets['Full Analysis']).length, 1619);
        assert.ok(xlsx.utils.sheet_to_json(book.Sheets['Full Analysis']).some(row => row.missing_courses.length > 0));
        const selectedResult = await engine.analyze(engine.sample('progress', selection), engine.sample('warehouse', selection), rules);
        for (const student of selectedResult) assert.deepEqual(student, actual.find(row => row.id === student.id));
        const filtered = await engine.analyze(engine.sample('progress', selection), engine.sample('warehouse', selection), rules, { advisor_lname: 'DoesNotExist' });
        assert.equal(filtered.length, 0);
        await assert.rejects(engine.analyze(new Uint8Array([1, 2]), new Uint8Array([3, 4]), rules));
        console.log('PASS: browser and backend results match exactly for 1,619 students; export, sample, filters, and invalid input verified.');
        console.log('Process memory after both engines (MB):', Math.round(process.memoryUsage().rss / 1024 / 1024));
    } finally { DB.end(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
