// Run against a local, disposable DEMO_MODE=true server:
// node test/demo.integration.cjs http://127.0.0.1:15000
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const base = process.argv[2] || 'http://127.0.0.1:15000';
const realFiles = process.argv[3] && process.argv[4];
function browser() {
    let cookie = '';
    return async (path, options = {}) => {
        const request = { ...options, headers: { ...options.headers, Cookie: cookie } };
        let response;
        try {
            response = await fetch(base + path, request);
        } catch (error) {
            // XLSX parsing can occupy the server past an idle connection's lifetime.
            // Retry a safe GET on a fresh connection; never replay an upload.
            if (options.method && options.method !== 'GET') throw error;
            response = await fetch(base + path, request);
        }
        const value = response.headers.get('set-cookie');
        if (value) cookie = value.split(';')[0];
        return response;
    };
}
function workbook(rows) {
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, xlsx.utils.json_to_sheet(rows), 'Data');
    return new Blob([xlsx.write(book, { type: 'buffer', bookType: 'xlsx' })]);
}
(async () => {
    const alice = browser(), bob = browser();
    const a = (await (await alice('/api/currentUser')).json()).user;
    const b = (await (await bob('/api/currentUser')).json()).user;
    assert.equal(a.demo, true);
    assert.equal(a.permissions, 1);
    assert.notEqual(a.pid, b.pid);
    for (const kind of ['progress', 'warehouse']) {
        const response = await alice(`/api/demo/sample/${kind}`);
        assert.equal(response.status, 200);
        const book = xlsx.read(Buffer.from(await response.arrayBuffer()));
        assert.equal(xlsx.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]).length, 3);
    }
    assert.equal((await alice('/api/checksheet/delete/', { method: 'DELETE' })).status, 403);
    assert.equal((await alice('/api/user/all')).status, 403);
    assert.equal((await alice('/api/audit', { method: 'POST', body: new FormData() })).status, 400);
    const form = new FormData();
    form.append('files', realFiles ? new Blob([require('fs').readFileSync(process.argv[3])]) : workbook([{
        ID: 900000001, Name: 'Demo Student', admit_term: 202109,
        term_taken: 202109, advisor_last_name: 'Demo', overall_hrs_attempted: 3,
        overall_gpa: 4, subj_expanded: 'CS', crse_numb: '1114', credit_hours: 3, grade: 'A',
    }]), 'fictional-progress.xlsx');
    form.append('files', realFiles ? new Blob([require('fs').readFileSync(process.argv[4])]) : workbook([{
        'STUDENT ID': 900000001, 'EMAIL ADDRESS': 'student@example.invalid',
        'COMPLETION TERM CODE': 202509, 'ADVISOR NAME': 'Demo, Advisor',
        'PRIMARY MAJOR CODE': 'CS',
        'CITIZEN CODE': 'US', 'STUDENT CLASS DESC': 'Senior',
    }]), 'fictional-warehouse.xlsx');
    assert.equal((await alice('/api/audit', { method: 'POST', body: form })).status, 202);
    let audit;
    for (let i = 0; i < 240; i++) {
        const { history } = await (await alice(`/api/audit/history/${a.pid}`)).json();
        audit = history.find(row => row.filename === 'fictional-progress.xlsx' && row.processing_time_ms >= 0);
        if (audit) break;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(audit, 'Import must finish successfully');
    const students = await (await alice(`/api/audit/${audit.audit_id}`)).json();
    assert.ok(students.length > 0);
    assert.equal(audit.num_incomplete_degree_students, students.filter(student => !student.graduation_ready).length);
    if (!realFiles) {
        assert.equal(students.length, 1);
        assert.equal(students[0].id, 900000001);
    }
    for (const route of [`/api/audit/${audit.audit_id}`, `/api/audit/${audit.audit_id}/info`, `/api/audit-file/${audit.audit_id}`]) {
        assert.equal((await bob(route)).status, 404, 'Other browsers cannot read an audit');
    }
    const forged = await (await bob(`/api/audit/history/${a.pid}`)).json();
    assert.equal(forged.history.length, 0, 'History uses the session identity');
    const info = await (await alice(`/api/audit/${audit.audit_id}/info`)).json();
    assert.equal(info.status, 'completed');
    const download = await alice(`/api/audit-file/${audit.audit_id}`);
    assert.equal(download.status, 200);
    const exported = xlsx.read(Buffer.from(await download.arrayBuffer()));
    assert.ok(exported.SheetNames.includes('Full Analysis'));
    console.log(`PASS: ${students.length} students; demo identity, access restrictions, XLSX import, analysis, session isolation, status, and XLSX export`);
})().catch(error => { console.error(error); process.exitCode = 1; });
