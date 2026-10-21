/**
 * 1920×1080 designer screenshots for docs/screenshots/.
 * Names match the board numbers.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.SHOT_DIR || join(root, 'docs/screenshots');
mkdirSync(out, { recursive: true });

const APP = process.env.APP_URL || 'http://127.0.0.1:5173';

const shots = [
  ['00a', '00a-sign-in-server'],
  ['00a2', '00a2-no-servers'],
  ['00b', '00b-quick-connect'],
  ['plex-pin', 'plex-pin-sign-in'],
  ['plex-home', 'plex-home'],
  ['00c', '00c-password'],
  ['01', '01-home'],
  ['01b', '01b-home-rows'],
  ['02', '02-details'],
  ['02b', '02b-audio-picker'],
  ['03', '03-player-overlay'],
  ['03b', '03b-output-states'],
  ['04a', '04a-wizard-detect'],
  ['04b', '04b-wizard-test'],
  ['04c', '04c-wizard-summary'],
  ['05', '05-settings'],
  ['05-scrolled', '05-settings-scrolled'],
  ['05b', '05b-convert-to-picker'],
];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1920,1080'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.setDefaultTimeout(20000);

async function prepare(board) {
  if (board === '01b') {
    await page.evaluate(() => {
      const rows = document.querySelector('[data-testid="home-rows"]');
      const next = document.querySelector('[data-row="next"]');
      if (rows && next) rows.scrollTop = next.offsetTop;
    });
    await new Promise((r) => setTimeout(r, 200));
  }
  if (board === '05-scrolled') {
    await page.evaluate(() => {
      const main = document.querySelector('[data-testid="settings-main"]');
      if (!main) return;
      const labels = [...main.querySelectorAll('.section-label')];
      const video = labels.find((el) => (el.textContent || '').includes('Video'));
      if (video) main.scrollTop = video.offsetTop;
    });
    await new Promise((r) => setTimeout(r, 200));
  }
}

for (const [board, name] of shots) {
  const route = board === '05-scrolled' ? '05' : board;
  await page.goto(`${APP}/#/preview/${route}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.screen');
  await new Promise((r) => setTimeout(r, 300));
  await prepare(board);
  const dest = join(out, `${name}.png`);
  await page.screenshot({ path: dest, type: 'png' });
  console.log('wrote', dest);
}

await browser.close();
console.log('done');
