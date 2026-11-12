import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

async function outputFiles(dir, base = dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await outputFiles(fullPath, base));
    else if (entry.isFile()) files.push(relative(base, fullPath).split(sep).join('/'));
  }
  return files;
}

/** Add install metadata and precache every published asset, with no runtime dependency. */
export function pwaBuild() {
  let root;
  let outDir;
  let buildWritten = false;
  return {
    name: 'sales-quest-pwa',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
      outDir = resolve(root, config.build.outDir);
    },
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: './apple-touch-icon.png' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Sales Quest' }, injectTo: 'head' },
      ];
    },
    writeBundle() { buildWritten = true; },
    async closeBundle() {
      if (!buildWritten) return;
      const files = (await outputFiles(outDir)).filter((file) => file !== 'sw.js' && !file.endsWith('.map')).sort();
      if (!files.includes('index.html') || !files.includes('manifest.webmanifest')) {
        throw new Error('PWA build requires index.html and manifest.webmanifest');
      }
      const template = await readFile(join(root, 'scripts/service-worker.js'), 'utf8');
      const hash = createHash('sha256').update(template);
      for (const file of files) {
        hash.update(file).update('\0').update(await readFile(join(outDir, file))).update('\0');
      }
      const revision = hash.digest('hex').slice(0, 20);
      if (!template.includes('__SQA_REVISION__') || !template.includes('/*__SQA_PRECACHE__*/ []')) {
        throw new Error('PWA service worker template is missing its build placeholders');
      }
      const script = template
        .replace('__SQA_REVISION__', revision)
        .replace('/*__SQA_PRECACHE__*/ []', JSON.stringify(files));
      await writeFile(join(outDir, 'sw.js'), script);
      console.log(`PWA: generated sw.js with ${files.length} offline assets (${revision})`);
    },
  };
}
