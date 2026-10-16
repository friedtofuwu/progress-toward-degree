const { spawnSync } = require('node:child_process');
require('./prepare-static.cjs');
const result = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/build')], {
    stdio: 'inherit',
    env: { ...process.env, REACT_APP_STATIC_DEMO: 'true', CI: 'false', GENERATE_SOURCEMAP: 'false' },
});
process.exitCode = result.status ?? 1;
