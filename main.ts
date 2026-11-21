// Lantern Watch: The Ember Archive — hand-in program.
//
// Copies the playable game (game/) and its screenshots (screenshots/)
// into the output directory and writes the dossier there, using the
// kit's buildDossier library. Runs twice in the grader and must write
// identical bytes both times, so everything here is sorted, synchronous,
// and free of timestamps, randomness, and environment-dependent order.

import { copyFileSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function outputDirectory(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv;
  return '/output';
}

function copyDirectoryTree(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  const entries = readdirSync(sourceDir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);
    const info = lstatSync(sourcePath);
    if (info.isSymbolicLink()) {
      throw new Error(`refusing to copy a symbolic link: ${sourcePath}`);
    }
    if (info.isDirectory()) {
      copyDirectoryTree(sourcePath, targetPath);
    } else if (info.isFile()) {
      copyFileSync(sourcePath, targetPath);
    } else {
      throw new Error(`refusing to copy a special file: ${sourcePath}`);
    }
  }
}

function handIn(): void {
  const outDir = outputDirectory();
  mkdirSync(outDir, { recursive: true });
  copyDirectoryTree(join(REPO_ROOT, 'game'), join(outDir, 'game'));
  copyDirectoryTree(join(REPO_ROOT, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

handIn();
