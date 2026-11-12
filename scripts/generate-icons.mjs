// Regenerate the checked-in PNG icons from the original SVG.
// Run `npx playwright install chromium` first, or set SQA_CHROMIUM_PATH.
import { copyFile, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const svg = (await readFile(new URL('../public/icons/icon-source.svg', import.meta.url), 'utf8'))
  .replace('width="512" height="512"', 'width="100%" height="100%"');
const browser = await chromium.launch({ executablePath: process.env.SQA_CHROMIUM_PATH || undefined });
try {
  for (const [size, path] of [
    [192, 'public/icons/icon-192.png'],
    [512, 'public/icons/icon-512.png'],
    [180, 'public/apple-touch-icon.png'],
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#4a2fd6}svg{display:block}</style>${svg}`);
    await page.screenshot({ path });
    await page.close();
  }
  // The important artwork sits well inside the maskable safe zone; its background bleeds to the edges.
  await copyFile('public/icons/icon-512.png', 'public/icons/icon-maskable-512.png');
} finally {
  await browser.close();
}
