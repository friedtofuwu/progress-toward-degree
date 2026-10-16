const { spawnSync } = require('node:child_process');
require('./prepare-static.cjs');
const result = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/test'), '--watchAll=false', '--runInBand', '--runTestsByPath', 'src/staticDemo/client.test.js'], {
    stdio: 'inherit', env: { ...process.env, REACT_APP_STATIC_DEMO: 'true', CI: 'true' },
});
process.exitCode = result.status ?? 1;
