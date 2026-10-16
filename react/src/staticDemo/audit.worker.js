/* global globalThis */
const engine = require('./engine');
const { loadSample } = require('./samplePool');
async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Unable to load demo data. Please reload the page.');
    return response.json();
}
globalThis.onmessage = async ({ data }) => {
    try {
        if (data.operation === 'analyze') {
            const snapshot = data.ruleSnapshot || { rows: await fetchJSON(data.rulesURL), years: [] };
            const rows = await engine.analyze(data.progress, data.warehouse, snapshot.rows, data.filters, snapshot.years);
            globalThis.postMessage({ rows });
        } else if (data.operation === 'sample') {
            const selection = await loadSample(data.sampleURL, fetchJSON);
            const progress = engine.sample('progress', selection), warehouse = engine.sample('warehouse', selection);
            globalThis.postMessage({ progress, warehouse, ids: selection.records.map(student => student.id) }, [progress, warehouse]);
        } else {
            const buffer = engine.exportRows(data.rows);
            globalThis.postMessage({ buffer }, [buffer]);
        }
    } catch (error) {
        globalThis.postMessage({ error: error.message || 'Unable to process this workbook.' });
    }
};
