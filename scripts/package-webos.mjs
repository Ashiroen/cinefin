#!/usr/bin/env node
/**
 * Stage the Vite production build with appinfo.json, icons, splash, and the
 * JS service, then run ares-package (@webos-tools/cli).
 *
 * Output: dist/ipk/<appId>_<version>_all.ipk
 */
import { execFileSync } from 'node:child_process';
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
const outDir = join(root, 'dist/ipk');
const serviceStage = join(webos, 'service');

const ICON_SIZES = {
  'icon.png': [80, 80],
  'largeIcon.png': [130, 130],
  'splash.png': [1920, 1080],
};

function pngDimensions(file) {
  const buf = readFileSync(file);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`${file} is not a PNG`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function requiredString(obj, key) {
  const value = obj[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`appinfo.json is missing a valid "${key}"`);
  }
  return value;
}

function validateAppinfo(appinfo) {
  const id = requiredString(appinfo, 'id');
  const version = requiredString(appinfo, 'version');
  requiredString(appinfo, 'title');
  requiredString(appinfo, 'main');
  requiredString(appinfo, 'vendor');
  requiredString(appinfo, 'icon');
  requiredString(appinfo, 'largeIcon');
  requiredString(appinfo, 'splashBackground');
  if (appinfo.type !== 'web') {
    throw new Error(`appinfo.json type must be "web", got ${JSON.stringify(appinfo.type)}`);
  }
  if (appinfo.main !== 'index.html') {
    throw new Error(`appinfo.json main must be "index.html", got ${JSON.stringify(appinfo.main)}`);
  }
  if (appinfo.icon !== 'icon.png' || appinfo.largeIcon !== 'largeIcon.png') {
    throw new Error('appinfo.json icon/largeIcon must be icon.png and largeIcon.png');
  }
  if (appinfo.splashBackground !== 'splash.png') {
    throw new Error('appinfo.json splashBackground must be splash.png');
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`appinfo.json version must be semver x.y.z, got ${JSON.stringify(version)}`);
  }
  return { id, version, ipkName: `${id}_${version}_all.ipk` };
}

function cliBin(name) {
  const localBin = join(root, 'node_modules', '.bin', name);
  return existsSync(localBin) ? localBin : name;
}

function runAres(args) {
  execFileSync(cliBin('ares-package'), args, { stdio: 'inherit', cwd: root });
}

function ensureCli() {
  try {
    execFileSync(cliBin('ares-package'), ['--version'], { stdio: 'pipe', cwd: root });
  } catch {
    console.log('ares-package not found — installing @webos-tools/cli locally…');
    execFileSync(
      'npm',
      ['install', '--no-save', '--no-package-lock', '@webos-tools/cli'],
      { cwd: root, stdio: 'inherit' },
    );
  }
}

if (!existsSync(viteOut) || !existsSync(join(viteOut, 'index.html'))) {
  console.error('Vite build missing. Run npm run build first.');
  process.exit(1);
}

const appinfo = JSON.parse(readFileSync(join(webos, 'appinfo.json'), 'utf8'));
const { ipkName } = validateAppinfo(appinfo);

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
mkdirSync(outDir, { recursive: true });

cpSync(viteOut, stage, {
  recursive: true,
  filter: (src) => !src.endsWith('.map'),
});

writeFileSync(join(stage, 'appinfo.json'), `${JSON.stringify(appinfo, null, 2)}\n`);

if (!existsSync(join(stage, 'index.html'))) {
  throw new Error('Staged app is missing index.html');
}

for (const [file, [width, height]] of Object.entries(ICON_SIZES)) {
  const src = join(webos, 'brand', file);
  if (!existsSync(src)) {
    throw new Error(`Missing brand asset ${src}`);
  }
  const size = pngDimensions(src);
  if (size.width !== width || size.height !== height) {
    throw new Error(`${file} must be ${width}×${height}, got ${size.width}×${size.height}`);
  }
  cpSync(src, join(stage, file));
}

for (const extra of ['package.json', 'services.json', 'discovery.js']) {
  if (!existsSync(join(serviceStage, extra))) {
    throw new Error(`Missing JS service file apps/webos/service/${extra}`);
  }
}

ensureCli();

try {
  execFileSync(cliBin('ares-config'), ['--profile', 'tv'], {
    stdio: 'pipe',
    cwd: root,
  });
} catch {
  // Profile defaults to tv; keep packing even if ares-config is unavailable.
}

const existing = join(outDir, ipkName);
if (existsSync(existing)) {
  rmSync(existing);
}

runAres(['--no-minify', '--outdir', outDir, stage, serviceStage]);

const ipkPath = join(outDir, ipkName);
if (!existsSync(ipkPath)) {
  throw new Error(`ares-package did not write ${ipkPath}`);
}

console.log(`IPK written to ${ipkPath}`);
runAres(['--info', ipkPath]);
