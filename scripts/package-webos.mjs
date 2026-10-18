#!/usr/bin/env node
/**
 * Copy the Vite build into a webOS app dir (appinfo + brand + JS service)
 * and run ares-package.
 */
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webos = join(root, 'apps/webos');
const viteOut = join(webos, 'dist');
const stage = join(webos, 'dist-webos');
const outDir = join(root, 'dist');

if (!existsSync(viteOut)) {
  console.error('Vite build missing. Run npm run build first.');
  process.exit(1);
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
mkdirSync(outDir, { recursive: true });

cpSync(viteOut, stage, { recursive: true });

const appinfo = JSON.parse(readFileSync(join(webos, 'appinfo.json'), 'utf8'));
writeFileSync(join(stage, 'appinfo.json'), JSON.stringify(appinfo, null, 2));

for (const file of ['icon.png', 'largeIcon.png', 'splash.png']) {
  cpSync(join(webos, 'brand', file), join(stage, file));
}

const serviceStage = join(root, 'apps/webos/service');

function runAres() {
  const localBin = join(root, 'node_modules', '.bin', 'ares-package');
  const bin = existsSync(localBin) ? localBin : 'ares-package';
  execSync(`"${bin}" "${stage}" "${serviceStage}" -o "${outDir}"`, {
    stdio: 'inherit',
  });
}

try {
  runAres();
} catch {
  console.log('ares-package not found — installing @webos-tools/cli locally…');
  execSync('npm install --no-save --no-package-lock @webos-tools/cli', {
    cwd: root,
    stdio: 'inherit',
  });
  runAres();
}

console.log('IPK written to', outDir);
