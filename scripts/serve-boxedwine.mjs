import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  work: { type: 'string', default: process.env.WEBAOE_WORK || 'D:/webaoe-work' },
  port: { type: 'string', default: '8090' },
} });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be 1024..65535');
const work = resolve(values.work);
const source = join(work, 'Boxedwine');
const expectedRevision = '8790ff20428c22daa64368af9553417e4f499c94';
const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (revision !== expectedRevision) throw new Error('Unexpected Boxedwine revision; review before running');
const root = join(source, 'project/emscripten/Build/Release');
for (const file of ['boxedwine.html', 'boxedwine.js', 'boxedwine.wasm', 'boxedwine-shell.js', 'fsfs.js']) {
  if (!(await stat(join(root, file))).size) throw new Error(`Empty build output: ${file}`);
}
async function hash(path) {
  const digest = createHash('sha256');
  for await (const block of createReadStream(path)) digest.update(block);
  return digest.digest('hex');
}
const filesystem = join(work, 'filesystems/Wine11-26R1.zip');
const expectedHash = '5d251b6d53cad1c31de254c5285603d193f91bc3129b9c9ba39c4cc65a24edb3';
if (await hash(filesystem) !== expectedHash) throw new Error('Wine filesystem SHA-256 mismatch');
const servedFilesystem = join(root, 'wine11.zip');
let servedHash;
try { servedHash = await hash(servedFilesystem); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (servedHash !== expectedHash) await copyFile(filesystem, servedFilesystem);
// Serve only the external build folder, never the repository or game installation.
const child = spawn(process.execPath, [join(source, 'project/emscripten/server.mjs'),
  '--root', root, '--port', String(port), '--host', '127.0.0.1'], { stdio: 'inherit' });
console.log('Development smoke test: locally compiled Boxedwine interpreter + Wine 11.');
console.log(`Open http://127.0.0.1:${port}/boxedwine.html?root=wine11&p=notepad.exe&sound=false&storageKey=smoke-wine11`);
console.log('Loopback only; networking disabled; no game files served. Ctrl+C to stop.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 0 : 1); });
