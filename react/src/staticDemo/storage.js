const LIMIT = 3;
let dbPromise;
function db() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open('saacs-local-demo', 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('audits', { keyPath: 'audit_id' });
            request.result.createObjectStore('history', { keyPath: 'audit_id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Browser storage is unavailable. Allow site storage or try another browser.'));
    });
    return dbPromise;
}
async function transact(mode, action, name = 'audits') {
    const database = await db();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(name, mode);
        const request = action(tx.objectStore(name));
        tx.oncomplete = () => resolve(request?.result);
        tx.onerror = () => reject(new Error('Unable to save results in this browser. Clear old demo data and try again.'));
        tx.onabort = tx.onerror;
    });
}
export async function saveAudit(audit) {
    const database = await db();
    const { rows, ...meta } = audit;
    await new Promise((resolve, reject) => {
        const tx = database.transaction(['audits', 'history'], 'readwrite');
        tx.objectStore('audits').put(audit);
        tx.objectStore('history').put(meta);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error('Unable to save results. Your browser storage may be full.'));
        tx.onabort = tx.onerror;
    });
    const history = await getAudits();
    for (const old of history.slice(LIMIT)) {
        await transact('readwrite', store => store.delete(old.audit_id));
        await transact('readwrite', store => store.delete(old.audit_id), 'history');
    }
}
export async function getAudits() {
    return (await transact('readonly', store => store.getAll(), 'history')).sort((a, b) => b.audit_id - a.audit_id);
}
export const getAudit = id => transact('readonly', store => store.get(Number(id)));
export const clearAudits = async () => {
    await transact('readwrite', store => store.clear());
    await transact('readwrite', store => store.clear(), 'history');
};
