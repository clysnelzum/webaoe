import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, basename } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  wasm: { type: 'string', multiple: true, default: [] },
  chrome: { type: 'string', default: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  output: { type: 'string', default: 'artifacts/runtime-capabilities' },
} });
// Only explicitly supplied modules are served. Never expose a directory.
const modules = await Promise.all(values.wasm.map(async path => {
  const bytes = await readFile(resolve(path));
  if (!bytes.subarray(0, 8).equals(Buffer.from([0,97,115,109,1,0,0,0]))) {
    throw new Error(`Not a Wasm v1 binary: ${path}`);
  }
  return { name: basename(path), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
const server = createServer((request, response) => {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Local runtime capability probe</title>');
    return;
  }
  const index = modules.findIndex((_, i) => request.url === `/module/${i}`);
  if (index < 0) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', 'application/wasm');
  response.end(modules[index].bytes);
});
const report = { startedAt: new Date().toISOString(), mode: 'headless, default Chrome flags', modules: [] };
let browser;
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  browser = await chromium.launch({ executablePath: values.chrome, headless: true });
  report.browserVersion = browser.version();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  report.capabilities = await page.evaluate(async () => {
    const simd = new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,
      10,22,1,20,0,253,12,...new Array(16).fill(0),11]);
    const result = { userAgent: navigator.userAgent, crossOriginIsolated,
      wasmSIMD: WebAssembly.validate(simd), wasmSuspending: typeof WebAssembly.Suspending === 'function',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined', webgpuAPI: !!navigator.gpu };
    try {
      const adapter = await navigator.gpu?.requestAdapter();
      result.webgpuAdapter = !!adapter;
      if (adapter) result.webgpuInfo = { vendor: adapter.info.vendor, architecture: adapter.info.architecture,
        device: adapter.info.device, description: adapter.info.description };
    } catch (error) { result.webgpuError = String(error); }
    return result;
  });
  for (const [index, module] of modules.entries()) {
    const result = await page.evaluate(async index => {
      const bytes = await (await fetch(`/module/${index}`)).arrayBuffer();
      const start = performance.now();
      try {
        // Compile only: no guest code, imports, Windows image or game is run.
        const compiled = await WebAssembly.compile(bytes);
        return { compiled: true, milliseconds: performance.now() - start,
          importCount: WebAssembly.Module.imports(compiled).length };
      } catch (error) { return { compiled: false, milliseconds: performance.now() - start, error: String(error) }; }
    }, index);
    report.modules.push({ name: module.name, bytes: module.bytes.length, sha256: module.sha256, ...result });
  }
} catch (error) {
  report.error = String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  const output = resolve(values.output);
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
