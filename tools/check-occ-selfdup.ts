#!/usr/bin/env node
/**
 * Stage C/D verification: are there mutual duplicates WITHIN the generated
 * harvest shards? The generator classifies candidates against the served
 * baseline in pass 1 and only adds accepted records to the index in pass 3,
 * so two records for the same physical camera that are both absent from the
 * baseline could in principle both be emitted. This checker replays the
 * repo's own matchers (src/lib/camera-expansion/dedupe) over the generated
 * set in file order: every record is classified against all records before
 * it; a 'duplicate' verdict means the later record duplicates an earlier
 * emitted one. Usage:
 *   npx esbuild tools/check-occ-selfdup.ts --bundle --platform=node \
 *     --format=esm --alias:@=./src --outfile=node_modules/.cache/check-occ-selfdup.mjs
 *   node node_modules/.cache/check-occ-selfdup.mjs [generated.ts path]
 */
import { readFileSync } from 'node:fs';
import { CameraIndex } from '../src/lib/camera-expansion/dedupe';
import type { CctvCamera } from '../src/app/api/cctv/types';

const path = process.argv[2] ?? 'src/app/api/cctv/opencctv-harvest.generated.ts';
const text = readFileSync(path, 'utf8');
const cameras: CctvCamera[] = [];
/* Current format: each shard is a JSON string const parsed at runtime
   (`const OCCX_DATA = "<json>"; export const OCCX = JSON.parse(OCCX_DATA)`)
   — extract and parse those payloads. Fallback: the original per-line
   object-literal format, for pre-Stage-C/D files. */
const dataBlocks = [...text.matchAll(/const OCC\w+_DATA = ("(?:\\.|[^"\\])*");/g)];
if (dataBlocks.length) {
  for (const block of dataBlocks) {
    const records = JSON.parse(JSON.parse(block[1])) as CctvCamera[];
    cameras.push(...records);
  }
} else {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{"id"')) continue;
    try {
      cameras.push(JSON.parse(trimmed.replace(/,$/, '')) as CctvCamera);
    } catch { /* not a record line */ }
  }
}

const index = new CameraIndex();
const dups: { id: string; method: string; matchedId: string }[] = [];
const byMethod = new Map<string, number>();
for (const camera of cameras) {
  const result = index.classify(camera);
  if (result.cls === 'duplicate') {
    dups.push({ id: camera.id, method: result.method, matchedId: result.matchedId });
    byMethod.set(result.method, (byMethod.get(result.method) ?? 0) + 1);
  } else {
    index.add(camera);
  }
}
console.log(`records: ${cameras.length}`);
console.log(`mutual duplicates within generated set: ${dups.length}`);
for (const [method, count] of byMethod) console.log(`  ${method}: ${count}`);
for (const dup of dups.slice(0, 20)) console.log(`  ${dup.id} --${dup.method}--> ${dup.matchedId}`);
