import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
function rejects(script, args, pattern) {
  const result = spawnSync(process.execPath, [`scripts/${script}`, ...args], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
}

test('browser diagnostic requires an explicit URL', () => {
  rejects('smoke-browser.mjs', [], /Usage:/);
});
test('browser diagnostic refuses a remote origin before launching Chrome', () => {
  rejects('smoke-browser.mjs', ['--url', 'https://example.com/'], /loopback URLs/);
});
test('Notepad interaction refuses a misleading localhost hostname', () => {
  rejects('smoke-notepad.mjs', ['--url', 'https://localhost.example.com/'], /Loopback URL required/);
});
test('development launcher rejects invalid ports before accessing external tools', () => {
  rejects('serve-boxedwine.mjs', ['--port', '80'], /Port must be/);
  rejects('serve-boxedwine.mjs', ['--port', '65536'], /Port must be/);
});
test('upstream preparation requires an external directory and refuses existing destination', () => {
  rejects('prepare-berrry.mjs', [], /Usage:/);
  rejects('prepare-berrry.mjs', ['--work', root], /outside this repository/);
  const dir = mkdtempSync(join(tmpdir(), 'webaoe-test-'));
  try {
    mkdirSync(join(dir, 'berrry-wine'));
    rejects('prepare-berrry.mjs', ['--work', dir], /Destination already exists/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('executable inspector rejects non-PE and identifies a synthetic PE without writing it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'webaoe-pe-'));
  try {
    const file = join(dir, 'test.bin');
    writeFileSync(file, 'not an exe');
    rejects('inspect-exe.mjs', ['--exe', file], /Not an MZ/);
    const data = Buffer.alloc(128); data.write('MZ'); data.writeUInt32LE(64, 0x3c);
    data.writeUInt32LE(0x4550, 64); data.writeUInt16LE(0x14c, 68); data.writeUInt16LE(0x10b, 88);
    writeFileSync(file, data);
    const result = spawnSync(process.execPath, ['scripts/inspect-exe.mjs', '--exe', file], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.machine, '0x14c'); assert.equal(parsed.optionalHeaderMagic, '0x10b');
    assert.equal(parsed.sha256.length, 64);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
