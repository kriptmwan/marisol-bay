// Marisol Bay — the entry program (Node 22, standard library only).
// It hands the game in: game/ and screenshots/ from beside this file are
// copied to the output directory, and dossier.json is written there with
// buildDossier from the vendored make.fun library, so the judge reads exactly
// what the game is. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}

function describeEntry() {
  const gameFiles = countFiles(gameDir);
  const shotFiles = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => statSync(join(shotsDir, f)).isFile()).length : 0;
  return `Marisol Bay: ${gameFiles} game files, ${shotFiles} screenshots`;
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`${describeEntry()} -> ${outputDir} (dossier ${dossier.length} bytes)`);
