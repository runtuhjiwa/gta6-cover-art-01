// Neon Sunset Cover Lab — the entry program for gta6-cover-art-01 (Node 22,
// standard library only). It hands the app in: it checks app/ and
// screenshots/ first (a small pre-flight, so a broken entry fails loudly
// here instead of at the scorer), copies both beside this file to /output,
// and writes /output/dossier.json with the vendored make.fun library.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: the app must exist with an index.html, and screenshots/ must
// hold 3 or 4 images, each at most 256 KiB, as the scorer requires.
const appDir = join(here, 'app');
if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error('pre-flight: app/index.html is missing');
}
const indexBytes = statSync(join(appDir, 'index.html')).size;
if (indexBytes > 1048576) {
  throw new Error(`pre-flight: app/index.html is ${indexBytes} bytes, over the 1 MiB cap`);
}
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) {
  throw new Error('pre-flight: screenshots/ is missing');
}
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`pre-flight: screenshots/ holds ${shots.length} files, need 3 or 4`);
}
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) {
    throw new Error(`pre-flight: screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
  // A screenshot must be a whole PNG or JPEG: check its magic bytes.
  const head = readFileSync(join(shotsDir, name)).subarray(0, 4);
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (!isPng && !isJpeg) {
    throw new Error(`pre-flight: screenshots/${name} is neither a PNG nor a JPEG`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
