export function runWorker(data, transfer = []) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./audit.worker.js', import.meta.url));
        const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Processing took too long. Try a smaller workbook.')); }, 180000);
        const finish = () => { clearTimeout(timeout); worker.terminate(); };
        worker.onmessage = ({ data: result }) => {
            finish();
            if (result.error) reject(new Error(result.error)); else resolve(result);
        };
        worker.onerror = () => { finish(); reject(new Error('The browser could not finish processing. Try smaller test files.')); };
        worker.postMessage(data, transfer);
    });
}
