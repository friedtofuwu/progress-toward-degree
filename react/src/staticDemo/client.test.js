import axios from 'axios';
import { indexedDB } from 'fake-indexeddb';
import { installStaticDemo, clearLocalAudits, resetLocalRules, reloadLocalRules, refreshSample, sampleFile } from './client';
import { saveAudit, getAudits, getAudit } from './storage';
import { runWorker } from './workerClient';
jest.mock('./workerClient', () => ({ runWorker: jest.fn() }));
const engine = require('./engine');
const courseRules = require('../../public/data/checksheets.json');
const sampleIndex = require('../../public/data/demo-students/index.json');
const sampleRecords = require('../../public/data/demo-students/pool-000.json').slice(0, 10);
const selection = { records: sampleRecords, headers: sampleIndex.headers };
const v8 = require('node:v8');
global.indexedDB = indexedDB;
global.structuredClone = value => v8.deserialize(v8.serialize(value));
const request = (url, method = 'get', data) => axios.defaults.adapter({ url, method, data });
beforeAll(() => {
    global.fetch = jest.fn(async () => ({ok: true, json: async () => courseRules}));
    installStaticDemo();
});
beforeEach(async () => {
    global.fetch = jest.fn(async () => ({ok: true, json: async () => courseRules}));
    await clearLocalAudits(); await resetLocalRules(); runWorker.mockReset();
});
test('source sample audit, browser persistence, history, export and clearing', async () => {
    runWorker.mockImplementation(async data => data.operation === 'analyze'
        ? { rows: await engine.analyze(data.progress, data.warehouse, data.ruleSnapshot.rows, data.filters, data.ruleSnapshot.years) }
        : { buffer: engine.exportRows(data.rows) });
    const files = ['progress', 'warehouse'].map(kind => ({ name: `${kind}.xlsx`, size: 1000, arrayBuffer: async () => engine.sample(kind, selection) }));
    const form = { getAll: () => files, get: () => 'ALL' };
    expect((await request('/api/currentUser')).data.user.local).toBe(true);
    expect((await request('/api/audit', 'post', form)).status).toBe(202);
    for (let i = 0; i < 40; i++) {
        if ((await request('/api/audit/status')).data.status === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    expect((await request('/api/audit/status')).data.status).toBe('completed');
    const history = (await request('/api/audit/history/local-demo')).data.history;
    expect(history).toHaveLength(1);
    expect(history[0].rows).toBeUndefined();
    expect(history[0].num_students).toBe(10);
    const students = (await request(`/api/audit/${history[0].audit_id}`)).data;
    expect(students).toHaveLength(10);
    for (const student of students) {
        const source = sampleRecords.find(record => record.id === student.id);
        expect(student.name).toBe(source.progress[0][sampleIndex.headers.progress.indexOf('name')]);
        expect(student.email).toBe(source.warehouse[0][sampleIndex.headers.warehouse.indexOf('EMAIL ADDRESS')]);
        expect(typeof student.graduation_ready).toBe('boolean');
        expect(Array.isArray(student.missing_courses)).toBe(true);
    }
    const exported = (await request(`/api/audit-file/${history[0].audit_id}`)).data;
    expect(exported.size).toBeGreaterThan(1000);
    await clearLocalAudits();
    expect(await getAudits()).toEqual([]);
    expect(await getAudit(history[0].audit_id)).toBeUndefined();
});
test('sample downloads use the same selected cohort until the next run', async () => {
    runWorker.mockResolvedValue({progress: engine.sample('progress', selection), warehouse: engine.sample('warehouse', selection), ids: sampleRecords.map(r => r.id)});
    await refreshSample();
    expect((await sampleFile('progress')).size).toBeGreaterThan(1000);
    expect((await sampleFile('warehouse')).size).toBeGreaterThan(1000);
    expect(runWorker).toHaveBeenCalledTimes(1);
    await refreshSample();
    await sampleFile('warehouse');
    expect(runWorker).toHaveBeenCalledTimes(2);
});
test('year creation, copying, course add/delete persist and are used by the next audit', async () => {
    await request('/api/checksheet/copy/2025/to/2026', 'post');
    const copied = (await request('/api/checksheet/get/year/2026')).data;
    expect(copied.core.length).toBe(courseRules.filter(row => row[0] === 2025 && row[2] === 'core').length);
    await request('/api/checksheet/year', 'post', {year: 2030});
    expect((await request('/api/checksheet/get/year/2030')).data).toEqual({year: 2030});
    const record = sampleRecords[0], admit = record.progress[0][sampleIndex.headers.progress.indexOf('admit_term')];
    const year = Math.floor(admit / 100) - (admit % 100 < 9 ? 1 : 0);
    const course = {year, subject: 'ZZZ', category: 'core', course_number: '9999', credit_hours: 3, passing_grade: 'C', conc_eligible: 'cs', substitutes: []};
    // Use axios as the UI does, including its JSON request serialization.
    await axios.post('/api/checksheet/add', course);
    await expect(axios.post('/api/checksheet/add', course)).rejects.toThrow('Duplicate');
    reloadLocalRules();
    expect((await request(`/api/checksheet/get/year/${year}`)).data.core.some(row => row.subject === 'ZZZ')).toBe(true);
    runWorker.mockImplementation(async data => {
        expect(data.ruleSnapshot.rows.some(row => row[1] === 'ZZZ' && row[3] === '9999')).toBe(true);
        return {rows: await engine.analyze(data.progress, data.warehouse, data.ruleSnapshot.rows, data.filters, data.ruleSnapshot.years)};
    });
    const files = ['progress', 'warehouse'].map(kind => ({name: `${kind}.xlsx`, size: 1000, arrayBuffer: async () => engine.sample(kind, selection)}));
    await request('/api/audit', 'post', {getAll: () => files, get: () => 'ALL'});
    for (let i = 0; i < 50; i++) {
        if ((await request('/api/audit/status')).data.status !== 'processing') break;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    expect((await request('/api/audit/status')).data.status).toBe('completed');
    const latest = (await getAudits())[0];
    expect((await getAudit(latest.audit_id)).rows.some(row => row.missing_courses.some(text => text.includes('ZZZ9999')))).toBe(true);
    await axios.delete('/api/checksheet/delete', {data: [course]});
    reloadLocalRules();
    expect((await request(`/api/checksheet/get/year/${year}`)).data.core.some(row => row.subject === 'ZZZ')).toBe(false);
    expect((await request('/api/checksheet/get/numbers')).data.some(row => row.year === 2030)).toBe(true);
});
test('retains only three recent audits and their results', async () => {
    for (let id = 1; id <= 4; id++) await saveAudit({ audit_id: id, filename: 'demo.xlsx', rows: [{ id }] });
    expect((await getAudits()).map(row => row.audit_id)).toEqual([4, 3, 2]);
    expect(await getAudit(1)).toBeUndefined();
    expect((await getAudit(4)).rows).toEqual([{ id: 4 }]);
});
test('invalid files surface an error without a network request', async () => {
    const form = { getAll: () => [{ name: 'wrong.csv', size: 100 }] };
    await expect(request('/api/audit', 'post', form)).rejects.toThrow('two XLSX');
    expect(runWorker).not.toHaveBeenCalled();
});
test('old incomplete saved results require a rerun instead of displaying empty missing classes', async () => {
    await saveAudit({ audit_id: 1, filename: 'old-demo.xlsx', rows: [{id: 900000001}] });
    await expect(request('/api/audit/1')).rejects.toThrow('older demo');
    await expect(request('/api/audit-file/1')).rejects.toThrow('older demo');
});
