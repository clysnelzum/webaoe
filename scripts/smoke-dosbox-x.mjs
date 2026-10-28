import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  dist: { type: 'string' },
  jspi: { type: 'boolean', default: false },
  chrome: { type: 'string', default: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  output: { type: 'string', default: 'artifacts/dosbox-x-smoke' },
} });
if (!values.dist) throw new Error('Usage: node scripts/smoke-dosbox-x.mjs --dist <verified emulators dist> [--jspi]');
const backend = values.jspi ? 'wdosbox-x-jspi' : 'wdosbox-x';
const assets = new Map(await Promise.all(['emulators.js', `${backend}.js`, `${backend}.wasm`].map(async name =>
  [`/${name}`, await readFile(resolve(values.dist, name))])));
const server = createServer((request, response) => {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>DOSBox-X command probe</title><script src="/emulators.js"></script>');
  } else if (assets.has(request.url)) {
    response.setHeader('Content-Type', request.url.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
    response.end(assets.get(request.url));
  } else response.writeHead(404).end();
});
const report = { startedAt: new Date().toISOString(), backend, console: [], errors: [], passed: false };
let browser;
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  browser = await chromium.launch({ executablePath: values.chrome, headless: true });
  report.browserVersion = browser.version();
  const page = await browser.newPage();
  page.on('console', m => report.console.push({ at: new Date().toISOString(), text: m.text() }));
  page.on('pageerror', e => report.errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(jspi => {
    window.probe = { ready: false, error: null };
    emulators.pathPrefix = '/';
    const config = { dosboxConf: '[sdl]\n[dosbox]\nmemsize=16\n[cpu]\ncore=normal\ncycles=fixed 3000\n[mixer]\nnosound=true\n[autoexec]\n@echo off\nmount c .\nc:\necho WEBAOE_DOSBOX_OK>probe.txt\n', jsdosConf: { version: '8.5.2' } };
    const launch = jspi ? emulators.dosboxXJspiDirect : emulators.dosboxXDirect;
    launch.call(emulators, config).then(ci => { window.ci = ci; window.probe.ready = true; }).catch(e => { window.probe.error = String(e); });
  }, values.jspi);
  await page.waitForFunction(() => window.probe.ready || window.probe.error, { }, { timeout: 60000 });
  report.launch = await page.evaluate(() => window.probe);
  if (report.launch.error) throw new Error(report.launch.error);
  await page.evaluate(() => {
    window.ci.fsReadFile('probe.txt').then(bytes => {
      window.probeText = new TextDecoder().decode(bytes);
    }).catch(error => { window.probe.error = String(error); });
  });
  await page.waitForFunction(() => typeof window.probeText === 'string' || window.probe.error, {}, { timeout: 30000 });
  report.result = await page.evaluate(async () => ({
    text: window.probeText,
    width: window.ci.width(), height: window.ci.height(), stats: await window.ci.asyncifyStats(),
  }));
  report.passed = report.result.text.trim() === 'WEBAOE_DOSBOX_OK';
  await page.evaluate(() => window.ci.exit());
} catch (error) {
  report.errors.push(String(error));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  await mkdir(resolve(values.output), { recursive: true });
  await writeFile(resolve(values.output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
