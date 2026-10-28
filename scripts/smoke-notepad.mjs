import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';

const { values } = parseArgs({ options: {
  url: { type: 'string' },
  chrome: { type: 'string', default: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  output: { type: 'string', default: 'artifacts/notepad-smoke' },
  'boot-seconds': { type: 'string', default: '75' },
} });
if (!values.url) throw new Error('Required: --url http://127.0.0.1:8090/boxedwine.html?root=wine6&p=notepad.exe&sound=false');
const url = new URL(values.url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Loopback URL required');
const bootSeconds = Number(values['boot-seconds']);
if (!Number.isFinite(bootSeconds) || bootSeconds < 1) throw new Error('Invalid boot-seconds');
const output = resolve(values.output);
await mkdir(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), url: url.href, console: [], errors: [], steps: [] };
const expected = 'webaoe';
let guestPath;
let browser;
let page;
try {
  browser = await chromium.launch({ executablePath: values.chrome, headless: true });
  report.browserVersion = browser.version();
  // One isolated context survives reload; it never accesses the user's profile.
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  page = await context.newPage();
  page.on('console', m => report.console.push(m.text()));
  page.on('pageerror', e => report.errors.push(String(e)));
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(bootSeconds * 1000);
  report.steps.push('initial boot wait completed');
  const lock = page.locator('#pointerLock');
  if (await lock.count()) await lock.uncheck();
  const canvas = page.locator('#canvas');
  await canvas.click({ position: { x: 80, y: 100 } });
  // The interpreter may only poll input every few hundred milliseconds on
  // older CPUs. Hold key transitions long enough instead of injecting a burst.
  await page.keyboard.type(expected, { delay: 350 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(output, '01-typed.png'), fullPage: true });
  await page.keyboard.press('Control+s', { delay: 800 });
  await page.waitForTimeout(12000);
  await page.screenshot({ path: resolve(output, '02-save-dialog.png'), fullPage: true });
  // A relative name uses Wine's default home directory and avoids layout-
  // dependent punctuation in a drive letter (':' requires a physical Shift).
  await page.keyboard.type('webaoesmoke.txt', { delay: 350 });
  await page.keyboard.press('Enter', { delay: 800 });
  const savedFile = await page.waitForFunction(() => {
    if (typeof FS === 'undefined') return false;
    // Wine versions choose different default directories; only search the
    // isolated overlay, without following symbolic links or editing guest data.
    const pending = ['/root'];
    for (let visited = 0; pending.length && visited < 5000; visited++) {
      const path = pending.shift();
      try {
        const stat = FS.lstat(path);
        if (FS.isDir(stat.mode)) {
          for (const name of FS.readdir(path)) {
            if (name !== '.' && name !== '..') pending.push(path + '/' + name);
          }
        } else if (path.endsWith('/webaoesmoke.txt') && stat.size > 0) return path;
      } catch { /* Not present yet or a non-readable entry. */ }
    }
    return false;
  }, undefined, { timeout: 45000 });
  guestPath = await savedFile.jsonValue();
  report.guestPath = guestPath;
  const readGuest = () => page.evaluate(path => Array.from(FS.readFile(path)), guestPath);
  const bytes = await readGuest();
  report.savedBytes = bytes;
  const buffer = Buffer.from(bytes);
  report.savedText = buffer[0] === 0xff && buffer[1] === 0xfe ? buffer.toString('utf16le') : buffer.toString('utf8');
  assert.ok(report.savedText.includes(expected), 'Saved file must contain keyboard input');
  report.steps.push('Notepad saved keyboard input to guest home directory');
  // Explicitly await the asynchronous IDBFS flush. A delay/unload alone is not proof.
  await page.evaluate(() => new Promise((resolve, reject) => FS.syncfs(false, e => e ? reject(e) : resolve())));
  await page.screenshot({ path: resolve(output, '03-saved.png'), fullPage: true });
  report.steps.push('IDBFS flush completed');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(path => {
    try { return typeof FS !== 'undefined' && FS.readFile(path).length > 0; } catch { return false; }
  }, guestPath, { timeout: 60000 });
  assert.deepEqual(await readGuest(), bytes, 'Saved bytes must survive a page reload');
  report.steps.push('Guest file restored byte-for-byte after page reload');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.errors.push(String(error));
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
    report.guestDiagnostics = await page.evaluate(() => {
      try { return { files: FS.readdir('/d_drive'), output: document.querySelector('#output')?.value?.slice(-12000) }; }
      catch (e) { return { error: String(e) }; }
    }).catch(e => ({ error: String(e) }));
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, steps: report.steps, errors: report.errors, output }, null, 2));
}
