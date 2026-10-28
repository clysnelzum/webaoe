// Read-only identity check, not an authenticity or DRM assessment.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { exe: { type: 'string' } } });
if (!values.exe) throw new Error('Usage: node scripts/inspect-exe.mjs --exe <path>');
const bytes = await readFile(values.exe);
if (bytes.length < 64 || bytes.toString('ascii', 0, 2) !== 'MZ') throw new Error('Not an MZ executable');
const pe = bytes.readUInt32LE(0x3c);
if (pe + 26 > bytes.length || bytes.readUInt32LE(pe) !== 0x4550) throw new Error('Invalid PE header');
const result = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
  machine: `0x${bytes.readUInt16LE(pe + 4).toString(16)}`, optionalHeaderMagic: `0x${bytes.readUInt16LE(pe + 24).toString(16)}` };
console.log(JSON.stringify(result, null, 2));
