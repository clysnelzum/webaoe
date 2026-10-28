import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';

const { values } = parseArgs({ options: {
  url: { type: 'string' },
  chrome: { type: 'string', default: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  output: { type: 'string', default: 'artifacts/browser-smoke' },
  seconds: { type: 'string', default: '90' },
  'capture-progress': { type: 'boolean', default: false },
} });
if (!values.url || !Number.isFinite(Number(values.seconds)) || Number(values.seconds) <= 0) {
  throw new Error('Usage: npm run smoke:browser -- --url http://127.0.0.1:8000/boxedwine.html?p=notepad --seconds 90');
}
const target = new URL(values.url);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) {
  throw new Error('This diagnostic only accepts loopback URLs');
}
const output = resolve(values.output);
await mkdir(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), url: target.href, console: [], errors: [], requestsFailed: [], samples: [] };
let browser;
try {
  // Playwright creates an isolated temporary profile, never the user's Chrome profile.
  browser = await chromium.launch({ executablePath: values.chrome, headless: true });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  page.on('console', message => report.console.push({ at: new Date().toISOString(), type: message.type(), text: message.text() }));
  page.on('pageerror', error => report.errors.push(String(error)));
  page.on('requestfailed', request => report.requestsFailed.push({ url: request.url(), error: request.failure() }));
  await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  report.capabilities = await page.evaluate(() => {
    const simd = new Uint8Array([
      0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,
      10,22,1,20,0,253,12,...new Array(16).fill(0),11,
    ]);
    return { userAgent: navigator.userAgent, crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      wasmSIMD: WebAssembly.validate(simd),
      wasmSuspending: typeof WebAssembly.Suspending === 'function' };
  });
  const deadline = Date.now() + Number(values.seconds) * 1000;
  do {
    await page.waitForTimeout(Math.min(5000, Math.max(0, deadline - Date.now())));
    const sample = await page.evaluate(() => ({
      status: document.querySelector('#status')?.textContent,
      output: document.querySelector('#output')?.value?.slice(-12000),
      canvas: (() => { const c = document.querySelector('canvas'); return c ? { width: c.width, height: c.height } : null; })(),
    }));
    if (values['capture-progress']) {
      // Screenshot the composed canvas area: do not request a 2D context from
      // an existing WebGL canvas or read a potentially discarded GL buffer.
      const canvas = page.locator('#canvas');
      if (await canvas.isVisible()) {
        const file = `frame-${String(report.samples.length).padStart(4, '0')}.png`;
        const png = await canvas.screenshot({ path: resolve(output, file), timeout: 10000 });
        sample.frame = { file, sha256: createHash('sha256').update(png).digest('hex') };
      }
    }
    sample.consoleEntries = report.console.length;
    report.samples.push({ at: new Date().toISOString(), ...sample });
    console.log(JSON.stringify({ at: report.samples.at(-1).at, status: sample.status, canvas: sample.canvas }));
  } while (Date.now() < deadline);
  await page.screenshot({ path: resolve(output, 'screen.png'), fullPage: true });
  // Capturing a canvas is evidence to inspect, not an automatic application pass.
  report.completed = true;
} catch (error) {
  report.completed = false;
  report.errors.push(String(error));
  process.exitCode = 1;
} finally {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Report: ${output}`);
}
