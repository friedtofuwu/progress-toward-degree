import axios from 'axios';
import { indexedDB } from 'fake-indexeddb';
import { installStaticDemo, clearLocalAudits } from './client';
import { saveAudit, getAudits, getAudit } from './storage';
import { runWorker } from './workerClient';
jest.mock('./workerClient', () => ({ runWorker: jest.fn() }));
const engine = require('./engine');
const courseRules = require('../../public/data/checksheets.json');
const v8 = require('node:v8');
global.indexedDB = indexedDB;
global.structuredClone = value => v8.deserialize(v8.serialize(value));
const request = (url, method = 'get', data) => axios.defaults.adapter({ url, method, data });
beforeAll(() => installStaticDemo());
beforeEach(async () => { await clearLocalAudits(); runWorker.mockReset(); });
test('real sample audit, browser persistence, history, export, read-only rules and clearing', async () => {
    runWorker.mockImplementation(async data => data.operation === 'analyze'
        ? { rows: await engine.analyze(data.progress, data.warehouse, courseRules, data.filters) }
        : { buffer: engine.exportRows(data.rows) });
    const files = ['progress', 'warehouse'].map(kind => ({ name: `${kind}.xlsx`, size: 1000, arrayBuffer: async () => engine.sample(kind) }));
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
    expect(history[0].num_students).toBe(3);
    const students = (await request(`/api/audit/${history[0].audit_id}`)).data;
    expect(students).toHaveLength(3);
    for (const student of students) {
        expect(student.email).toBe(`student${student.id}@example.invalid`);
        expect(student.graduation_ready).toBe(false);
        expect(student.missing_courses.length).toBeGreaterThan(0);
        expect(student.citizen_code).toBe('US');
    }
    const exported = (await request(`/api/audit-file/${history[0].audit_id}`)).data;
    expect(exported.size).toBeGreaterThan(1000);
    await expect(request('/api/checksheet/delete/', 'delete')).rejects.toThrow('read-only');
    await clearLocalAudits();
    expect(await getAudits()).toEqual([]);
    expect(await getAudit(history[0].audit_id)).toBeUndefined();
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
