const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.env.EAS_BUILD_PLATFORM !== 'android') {
  process.exit(0);
}

const reactNativeRoot = path.dirname(require.resolve('react-native/package.json'));
const compiler = path.join(reactNativeRoot, 'sdks', 'hermesc', 'linux64-bin', 'hermesc');

try {
  const stat = fs.statSync(compiler);
  if (!stat.isFile()) throw new Error('Compiler path is not a file');
  if ((stat.mode & 0o111) === 0) {
    fs.chmodSync(compiler, stat.mode | 0o755);
    console.log(`Restored executable permissions for ${compiler}`);
  }
} catch (error) {
  console.error(`Hermes compiler is unavailable at ${compiler}: ${error.message}`);
  process.exit(1);
}

const result = spawnSync(compiler, ['-version'], { encoding: 'utf8' });
if (result.error || result.status !== 0) {
  console.error(`Cannot run Hermes compiler at ${compiler}`);
  console.error(result.error || result.stderr || `Exit status: ${result.status}`);
  process.exit(1);
}
console.log(`Hermes compiler is executable: ${compiler}`);
