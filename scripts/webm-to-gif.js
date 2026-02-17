#!/usr/bin/env node
/**
 * Converts WebM walkthrough videos to GIF so they display inline on GitHub
 * (GitHub does not play WebM in markdown; animated GIFs work).
 * Run after copy-walkthrough-videos.js. Requires ffmpeg on PATH.
 *
 * Usage: node scripts/webm-to-gif.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WALKTHROUGH_VIDEOS_DIR = path.join(__dirname, '..', 'docs', 'e2e', 'walkthrough-videos');

// ffmpeg options: 640px width, 10 fps, palette for smaller/sharper GIF
function webmToGif(webmPath, gifPath) {
  const args = [
    '-i', webmPath,
    '-vf', 'fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer',
    '-y',
    gifPath,
  ];
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

function main() {
  if (!fs.existsSync(WALKTHROUGH_VIDEOS_DIR)) {
    console.error('No docs/e2e/walkthrough-videos directory. Run copy-walkthrough-videos.js first.');
    process.exit(1);
  }

  const files = fs.readdirSync(WALKTHROUGH_VIDEOS_DIR);
  const webmFiles = files.filter((f) => f.endsWith('.webm'));

  if (webmFiles.length === 0) {
    console.error('No .webm files in docs/e2e/walkthrough-videos. Run copy-walkthrough-videos.js first.');
    process.exit(1);
  }

  let converted = 0;
  for (const webm of webmFiles) {
    const base = path.basename(webm, '.webm');
    const gifName = `${base}.gif`;
    const webmPath = path.join(WALKTHROUGH_VIDEOS_DIR, webm);
    const gifPath = path.join(WALKTHROUGH_VIDEOS_DIR, gifName);
    console.log(`Converting ${webm} -> ${gifName}...`);
    webmToGif(webmPath, gifPath);
    converted++;
  }
  console.log(`Converted ${converted} WebM files to GIF.`);
}

main();
