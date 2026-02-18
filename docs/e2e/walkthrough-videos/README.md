# 🎬 Walkthrough videos

Stable-named clips for the [Real usage walkthrough](../../real-usage-walkthrough.md): `walkthrough-1-home.webm` … `walkthrough-6-delete.webm`, plus `.gif` versions for **GitHub** (GitHub does not play WebM inline; animated GIFs display in markdown).

**📹 Generate WebM clips** (from E2E runs):

```bash
node scripts/copy-walkthrough-videos.js
```

Or `yarn test:e2e:walkthrough` to run tests and copy in one go.

**🖼️ Generate GIFs** (for inline playback on GitHub; requires [ffmpeg](https://ffmpeg.org/) on PATH):

```bash
node scripts/webm-to-gif.js
```

Source recordings are in `e2e/e2e-videos/` (gitignored).
