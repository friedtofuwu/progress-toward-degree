/* global globalThis */
const engine = require('./engine');
globalThis.onmessage = async ({ data }) => {
    try {
        if (data.operation === 'analyze') {
            const response = await fetch(data.rulesURL);
            if (!response.ok) throw new Error('Unable to load course rules. Please reload the page.');
            const rows = await engine.analyze(data.progress, data.warehouse, await response.json(), data.filters);
            globalThis.postMessage({ rows });
        } else {
            const buffer = data.operation === 'sample' ? engine.sample(data.kind) : engine.exportRows(data.rows);
            globalThis.postMessage({ buffer }, [buffer]);
        }
    } catch (error) {
        globalThis.postMessage({ error: error.message || 'Unable to process this workbook.' });
    }
};
