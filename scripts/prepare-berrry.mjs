// Prepare an external, pinned upstream checkout. Never reset an existing tree.
import { spawnSync } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';

const REVISION = 'de6dd63aa66e673007fec6b90cc98256246fc762';
const REMOTE = 'https://github.com/vgrichina/berrry-wine.git';
const { values } = parseArgs({ options: { work: { type: 'string' } } });
if (!values.work) throw new Error('Usage: node scripts/prepare-berrry.mjs --work <external-directory>');
const work = resolve(values.work);
const repo = resolve('.');
if (work === repo || work.startsWith(repo + (process.platform === 'win32' ? '\\' : '/'))) {
  throw new Error('Work directory must be outside this repository');
}
const dest = join(work, 'berrry-wine');
try { await stat(dest); throw new Error(`Destination already exists, refusing to modify: ${dest}`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(work, { recursive: true });
function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git failed (status ${result.status}); inspect ${dest} before retrying`);
}
git(['init', dest], work);
git(['config', 'core.autocrlf', 'false'], dest);
git(['remote', 'add', 'origin', REMOTE], dest);
git(['-c', 'protocol.version=2', 'fetch', '--depth=1', '--filter=blob:none', 'origin', REVISION], dest);
git(['checkout', '--detach', REVISION], dest);
console.log(`Prepared ${dest} at ${REVISION}. No dependencies installed or game files accessed.`);
