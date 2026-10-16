const xlsx = require('xlsx');
const { analyzeStudents } = require('./generated/parser');
const { readCourseRows, readFullDataRows } = require('./generated/rows');
const { setRules } = require('./rules');
function readRows(buffer) {
    const wb = xlsx.read(buffer, { type: 'array', dense: true, cellHTML: false, cellFormula: false, cellNF: false });
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    return rows;
}
async function analyze(progress, warehouse, rules, filters = {}, declaredYears = []) {
    setRules(rules, declaredYears);
    const students = readCourseRows(readRows(progress));
    const extra = readFullDataRows(readRows(warehouse));
    if (!Object.keys(students).length || !Object.keys(extra).length) {
        throw new Error('No student records found. Check that the two Excel files use the expected headers.');
    }
    const result = await analyzeStudents(students, extra, filters);
    const additional = new Map(result.additional.map(row => [Number(row.id), row]));
    return result.students.map(student => {
        const details = additional.get(Number(student.id));
        if (!details) throw new Error(`Audit details are missing for student ${student.id}. Please rerun the audit.`);
        const { id, email_address, ...fields } = details;
        return { ...student, ...fields, email: email_address };
    });
}
function exportRows(students) {
    const rows = students.map(student => ({ ...student, missing_courses: Array.isArray(student.missing_courses) ? student.missing_courses.join('; ') : student.missing_courses }));
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, xlsx.utils.json_to_sheet(rows), 'Full Analysis');
    return xlsx.write(book, { type: 'array', bookType: 'xlsx' });
}
function sample(kind, selection) {
    if (!selection?.records?.length || !selection.headers[kind]) throw new Error('No source students selected for the sample.');
    const rows = [selection.headers[kind], ...selection.records.flatMap(student => student[kind])];
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(rows), 'Demo');
    return xlsx.write(book, { type: 'array', bookType: 'xlsx' });
}
module.exports = { analyze, exportRows, sample };
