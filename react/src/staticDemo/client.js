import axios from 'axios';
import { getAudits, getAudit, saveAudit, clearAudits } from './storage';
import { runWorker as executeWorker } from './workerClient';
const rules = require('./rules');
export const staticDemo = process.env.REACT_APP_STATIC_DEMO === 'true';
export const localUser = { pid: 'local-demo', permissions: 1, campus: 2, demo: true, local: true };
let job = { status: 'idle', message: null };
let rulesPromise;
const rulesURL = () => new URL(`${process.env.PUBLIC_URL || ''}/data/checksheets.json`, window.location.href).href;
function runWorker(data, transfer = []) {
    return executeWorker({ ...data, rulesURL: rulesURL() }, transfer);
}
async function loadRules() {
    if (!rulesPromise) rulesPromise = fetch(rulesURL()).then(response => {
        if (!response.ok) throw new Error('Unable to load course rules.');
        return response.json();
    }).then(rows => rules.setRules(rows)).catch(error => { rulesPromise = null; throw error; });
    await rulesPromise;
}
export async function sampleFile(kind) {
    const { buffer } = await runWorker({ operation: 'sample', kind });
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
export async function downloadSample(kind) {
    const url = URL.createObjectURL(await sampleFile(kind));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `demo-${kind}.xlsx`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function clearLocalAudits() {
    if (job.status === 'processing') throw new Error('Wait for the current audit to finish.');
    await clearAudits();
}
function normalize(value) {
    return value && value !== 'ALL' ? value : null;
}
async function importFiles(form) {
    if (job.status === 'processing') throw new Error('An audit is already running in this tab.');
    const files = form.getAll('files');
    if (files.length !== 2 || files.some(file => !/\.xlsx$/i.test(file.name || '') || file.size > 20 * 1024 * 1024)) {
        throw new Error('Select two XLSX files, each no larger than 20 MB.');
    }
    job = { status: 'processing', message: null };
    const started = Date.now();
    const filters = Object.fromEntries(['advisor_lname', 'concentrations', 'grad_terms'].map(key => [key, normalize(form.get(key))]));
    // Return immediately so the existing page can display progress while the worker runs.
    (async () => {
        try {
            const [progress, warehouse] = await Promise.all(files.map(file => file.arrayBuffer()));
            const { rows } = await runWorker({ operation: 'analyze', progress, warehouse, filters }, [progress, warehouse]);
            const meta = {
                audit_id: started, initiating_user_pid: localUser.pid, timestamp: new Date(started).toISOString(),
                filename: files[0].name, processing_time_ms: Date.now() - started, num_students: rows.length,
                num_incomplete_degree_students: rows.filter(row => !row.graduation_ready).length,
            };
            await saveAudit({ ...meta, rows });
            job = { status: 'completed', message: null };
        } catch (error) {
            job = { status: 'failed', message: error.message || 'Unable to process the files.' };
        }
    })();
    return { status: 202, data: { message: 'Processing locally in your browser.' } };
}
async function handle(path, method, data) {
    if (path === '/api/currentUser') return { user: localUser };
    if (path === '/api/audit/status') return { ...job };
    if (path === '/api/audit' && method === 'post') return importFiles(data);
    if (method !== 'get') throw new Error('Course rules are read-only in the portfolio demo.');
    const sample = path.match(/^\/api\/demo\/sample\/(progress|warehouse)$/);
    if (sample) return sampleFile(sample[1]);
    if (/^\/api\/audit\/history\//.test(path)) return { history: await getAudits() };
    const auditMatch = path.match(/^\/api\/(audit|audit-file)\/(\d+)(\/info)?$/);
    if (auditMatch) {
        const audit = await getAudit(auditMatch[2]);
        if (!audit) throw new Error('This audit is no longer stored in this browser.');
        if (auditMatch[1] === 'audit-file') {
            const { buffer } = await runWorker({ operation: 'export', rows: audit.rows });
            return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        }
        if (auditMatch[3]) return { ...audit, rows: undefined, status: 'completed', processed_students: audit.num_students, total_students: audit.num_students, progress: 1, started_at: audit.timestamp };
        return audit.rows;
    }
    await loadRules();
    if (path === '/api/checksheet/get/numbers') return rules.getYears().map(year => ({ year }));
    const year = path.match(/^\/api\/checksheet\/get\/year\/(\d+)(?:\/([^/]+))?$/);
    if (year) {
        const value = rules.getRules(year[1]);
        return year[2] ? { [year[2]]: value[year[2]] || [], year: Number(year[1]) } : value;
    }
    const category = path.match(/^\/api\/checksheet\/categories\/(\d+)\/([^/]+)$/);
    if (category) {
        const groups = rules.getRules(category[1]);
        return (groups[category[2]] || []).flatMap(row => [row.subject + row.course_number, ...(row.substitutes || []).map(sub => sub.subject + sub.course_number)]);
    }
    throw new Error('This action is unavailable in the browser demo.');
}
export function installStaticDemo() {
    if (!staticDemo) return;
    axios.defaults.adapter = async config => {
        try {
            const value = await handle(config.url.split('?')[0], config.method || 'get', config.data);
            const isAccepted = config.method === 'post' && config.url === '/api/audit';
            return { data: isAccepted ? value.data : value, status: isAccepted ? 202 : 200, statusText: 'OK', headers: {}, config };
        } catch (error) {
            throw new axios.AxiosError(error.message, 'ERR_LOCAL_DEMO', config, null, { status: 400, data: { message: error.message }, headers: {}, config });
        }
    };
}
