// Execute the emitted worker in an isolated JS context, including emitted chunks.
// This checks packaging; it does not replace real-browser UI verification.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const js = path.resolve(__dirname, '../build/static/js');
const files = fs.readdirSync(js).filter(file => file.endsWith('.js'));
const worker = files.find(file => fs.readFileSync(path.join(js, file), 'utf8').includes('globalThis.onmessage='));
assert.ok(worker, 'Worker entry must be emitted');
const rules = require('../public/data/checksheets.json');
async function execute(data) {
    let resolve, reject;
    const result = new Promise((done, fail) => { resolve = done; reject = fail; });
    const context = vm.createContext({
        console, URL, ArrayBuffer, Uint8Array, Uint16Array, Uint32Array, Int32Array, Float64Array, TextDecoder, TextEncoder, setTimeout, clearTimeout,
        location: `https://example.invalid/static/js/${worker}`,
        fetch: async () => ({ ok: true, json: async () => rules }),
        postMessage: value => value.error ? reject(new Error(value.error)) : resolve(value),
    });
    context.self = context;
    context.importScripts = (...urls) => urls.forEach(url => vm.runInContext(fs.readFileSync(path.join(js, path.basename(new URL(url, context.location).pathname)), 'utf8'), context));
    vm.runInContext(fs.readFileSync(path.join(js, worker), 'utf8'), context);
    await new Promise(setImmediate);
    Promise.resolve(context.onmessage({ data })).catch(reject);
    return result;
}
(async () => {
    const progress = (await execute({ operation: 'sample', kind: 'progress' })).buffer;
    const warehouse = (await execute({ operation: 'sample', kind: 'warehouse' })).buffer;
    const { rows } = await execute({ operation: 'analyze', progress, warehouse, rulesURL: 'https://example.invalid/data/checksheets.json' });
    assert.equal(rows.length, 3);
    assert.equal(rows[0].id, 900000001);
    const exported = await execute({ operation: 'export', rows });
    assert.ok(exported.buffer.byteLength > 1000);
    console.log('PASS: production worker chunks load and execute sample creation, real audit analysis, and Excel export.');
})().catch(error => { console.error(error); process.exitCode = 1; });
