const { spawnSync } = require('node:child_process');

function runAdb(args) {
  const result = spawnSync('adb', args, { stdio: 'inherit' });
  return result.status ?? 1;
}

function main() {
  let status = runAdb(['start-server']);
  if (status !== 0) {
    process.exit(status);
  }

  status = runAdb(['reverse', 'tcp:8081', 'tcp:8081']);
  if (status !== 0) {
    process.exit(status);
  }

  status = runAdb(['reverse', 'tcp:8097', 'tcp:8097']);
  if (status !== 0) {
    process.exit(status);
  }
}

main();
