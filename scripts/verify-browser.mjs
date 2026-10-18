/**
 * 1920×1080 screenshots of every boarded preview route, then a live
 * Jellyfin walk (manual address → password → home → details → play).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.SHOT_DIR || join(root, 'docs/verification');
mkdirSync(out, { recursive: true });

const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
const SERVER = process.env.JF_URL || '127.0.0.1:8096';
const USER = process.env.JF_USER || 'Vojtech';
const PASS = process.env.JF_PASS || 'cinefin';

const boards = [
  '00a',
  '00a2',
  '00b',
  '00c',
  '01',
  '01b',
  '02',
  '02b',
  '03',
  '03b',
  '04a',
  '04b',
  '04c',
  '05',
  '05b',
];

const notes = [];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1920,1080'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.setDefaultTimeout(20000);
page.on('pageerror', (err) => notes.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') notes.push(`console.error: ${msg.text()}`);
});

async function shot(name) {
  const dest = join(out, `${name}.png`);
  await page.screenshot({ path: dest, type: 'png' });
  console.log('wrote', dest);
}

async function fillReactInput(selector, value) {
  await page.waitForSelector(selector);
  await page.focus(selector);
  await page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`missing ${sel}`);
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (!desc?.set) throw new Error(`no value setter on ${sel}`);
    desc.set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}

for (const board of boards) {
  await page.goto(`${APP}/#/preview/${board}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.screen');
  await new Promise((r) => setTimeout(r, 250));
  await shot(`preview-${board}`);
}

await page.goto(`${APP}/#/connect/empty`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-testid="address"]');
await shot('live-00-empty-connect');

await page.click('[data-focusable="address"]');
await fillReactInput('[data-testid="address"]', SERVER);
await page.click('[data-focusable="connect"]');

try {
  await page.waitForFunction(
    () =>
      location.hash.includes('signin') ||
      document.body.innerText.includes('Needs Jellyfin'),
    { timeout: 8000 },
  );
} catch {
  notes.push('Connect did not leave the address screen — see live-01-after-connect.png');
}
await new Promise((r) => setTimeout(r, 400));
await shot('live-01-after-connect');
notes.push(`hash after connect: ${await page.evaluate(() => location.hash)}`);
notes.push(`body snippet: ${(await page.evaluate(() => document.body.innerText)).slice(0, 240)}`);

if ((await page.evaluate(() => location.hash)).includes('quick')) {
  await page.click('[data-focusable="password"]');
  await page.waitForFunction(() => location.hash.includes('password'));
}
await new Promise((r) => setTimeout(r, 300));
await shot('live-02-password');

const users = await page.$$('[data-focusable^="user-"]');
let pickedUser = false;
for (const el of users) {
  const label = await el.evaluate((n) => n.textContent || '');
  if (label.toLowerCase().includes(USER.toLowerCase())) {
    await el.click();
    pickedUser = true;
    break;
  }
}
if (!pickedUser) {
  const other = await page.$('[data-focusable="other"]');
  if (other) await other.click();
  if (await page.$('[data-testid="username"]')) {
    await fillReactInput('[data-testid="username"]', USER);
  }
}

if (await page.$('[data-testid="password"]')) {
  await fillReactInput('[data-testid="password"]', PASS);
}
await page.click('[data-focusable="signin"]');
try {
  await page.waitForFunction(() => location.hash.includes('home'), { timeout: 8000 });
} catch {
  const err = await page.evaluate(
    () => document.querySelector('[data-testid="signin-error"]')?.textContent || '',
  );
  notes.push(`Sign-in did not reach Home${err ? ` (${err})` : ''}`);
}
try {
  await page.waitForFunction(
    () =>
      Boolean(document.querySelector('[data-focusable^="lib-"], [data-focusable^="resume-"]')) ||
      document.body.innerText.includes('Your library is empty'),
    { timeout: 10000 },
  );
} catch {
  notes.push('Home never rendered a row or empty state');
}
await new Promise((r) => setTimeout(r, 400));
await shot('live-03-home');
notes.push(`hash after signin: ${await page.evaluate(() => location.hash)}`);
notes.push(`home text: ${(await page.evaluate(() => document.body.innerText)).slice(0, 400)}`);

const card = await page.$('[data-focusable^="lib-"], [data-focusable^="resume-"]');
if (card) {
  await card.click();
  await page.waitForFunction(() => location.hash.includes('item'), { timeout: 8000 }).catch(() => {
    notes.push('Poster click did not open Details');
  });
  await new Promise((r) => setTimeout(r, 600));
}
await shot('live-04-details');

const play = await page.$('[data-focusable="play"]');
if (play) {
  await play.click();
  await page
    .waitForFunction(
      () => {
        const v = document.querySelector('video');
        return Boolean(v && (v.currentSrc || v.readyState > 0) && !v.error);
      },
      { timeout: 10000 },
    )
    .catch(() => notes.push('Video never started'));
  await new Promise((r) => setTimeout(r, 800));
}
await shot('live-05-player');
notes.push(`hash after play: ${await page.evaluate(() => location.hash)}`);
const videoState = await page.evaluate(() => {
  const v = document.querySelector('video');
  if (!v) return { present: false };
  return {
    present: true,
    src: v.currentSrc || v.src,
    paused: v.paused,
    time: v.currentTime,
    duration: Number.isFinite(v.duration) ? v.duration : null,
    error: v.error ? v.error.message || String(v.error.code) : null,
    readyState: v.readyState,
  };
});
notes.push(`video: ${JSON.stringify(videoState)}`);

writeFileSync(join(out, 'notes.txt'), `${notes.join('\n')}\n`);
await browser.close();
console.log('done', notes);
