# Walkthrough media

Short **WebM** and **GIF** clips used by [Real usage walkthrough](../real-usage-walkthrough.md). Files are committed as static assets.

To regenerate **GIFs** from the WebM files (requires [ffmpeg](https://ffmpeg.org/) on your PATH):

```bash
yarn walkthrough:gif
```

This runs `scripts/webm-to-gif.js` and writes `walkthrough-*.gif` next to the `.webm` files in this directory.
