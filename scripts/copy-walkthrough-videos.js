#!/usr/bin/env node
/**
 * Copies Playwright E2E videos from e2e/e2e-videos (test output) into
 * docs/e2e/walkthrough-videos/ with stable filenames used by docs/real-usage-walkthrough.md.
 * Run after `yarn test:e2e` so the walkthrough page video links keep working.
 *
 * Usage: node scripts/copy-walkthrough-videos.js
 */

const fs = require('fs');
const path = require('path');

const E2E_VIDEOS_DIR = path.join(__dirname, '..', 'e2e', 'e2e-videos');
const WALKTHROUGH_VIDEOS_DIR = path.join(__dirname, '..', 'docs', 'e2e', 'walkthrough-videos');

const SPEC_TO_WALKTHROUGH = [
  { prefix: 'home-dashboard', out: 'walkthrough-1-home.webm' },
  { prefix: 'create-hypothesis', out: 'walkthrough-2-create.webm' },
  { prefix: 'view-hypothesis-detail', out: 'walkthrough-3-view-detail.webm' },
  { prefix: 'edit-hypothesis', out: 'walkthrough-4-edit.webm' },
  { prefix: 'technical-planning', out: 'walkthrough-5-technical-planning.webm' },
  { prefix: 'delete-hypothesis', out: 'walkthrough-6-delete.webm' },
];

function main() {
  if (!fs.existsSync(E2E_VIDEOS_DIR)) {
    console.error('No e2e/e2e-videos directory. Run yarn test:e2e first.');
    process.exit(1);
  }

  if (!fs.existsSync(WALKTHROUGH_VIDEOS_DIR)) {
    fs.mkdirSync(WALKTHROUGH_VIDEOS_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(E2E_VIDEOS_DIR, { withFileTypes: true });
  const videoDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(E2E_VIDEOS_DIR, e.name))
    .filter((dir) => {
      const videoPath = path.join(dir, 'video.webm');
      return fs.existsSync(videoPath);
    });

  let copied = 0;
  for (const { prefix, out } of SPEC_TO_WALKTHROUGH) {
    const matching = videoDirs.filter((dir) => path.basename(dir).startsWith(prefix));
    if (matching.length === 0) {
      console.warn(`No video found for ${prefix} -> ${out}`);
      continue;
    }
    // Prefer folder without "-retry" (first run); otherwise take latest by mtime
    const sorted = matching.sort((a, b) => {
      const aRetry = a.includes('-retry');
      const bRetry = b.includes('-retry');
      if (aRetry !== bRetry) return aRetry ? 1 : -1;
      const aStat = fs.statSync(path.join(a, 'video.webm'));
      const bStat = fs.statSync(path.join(b, 'video.webm'));
      return bStat.mtimeMs - aStat.mtimeMs;
    });
    const src = path.join(sorted[0], 'video.webm');
    const dest = path.join(WALKTHROUGH_VIDEOS_DIR, out);
    fs.copyFileSync(src, dest);
    console.log(`${out} <- ${path.basename(sorted[0])}/video.webm`);
    copied++;
  }
  console.log(`Copied ${copied} walkthrough videos to docs/e2e/walkthrough-videos/.`);
}

main();
