// Vice Panels — the entry program for gta6-cover-art-01 (Node 22, standard library only).
// It hands the app in: copies this repository's app/ and screenshots/ into the output
// directory and writes /output/dossier.json with the vendored make.fun dossier library, so
// the sealed gate can check the app and the judge can read its summary. Run it locally with
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; without it, /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps are the gate's own limits (reference/gate.json): the dossier text cap shapes the
// bytes, and the rest refuse an entry the scorer would refuse — more than 4 screenshots or
// one over 256 KiB, more than 993 files in app/ or 48 MiB of app files in all, or a path
// under app/ over 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
console.log(`Wrote ${outputDir}/dossier.json from app/ and screenshots/.`);
