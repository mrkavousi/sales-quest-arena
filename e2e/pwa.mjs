/**
 * Production PWA checks. `npm run build && node e2e/pwa.mjs`
 * Run `npx playwright install chromium` once, or set SQA_CHROMIUM_PATH.
 * A local static server lets the test simulate a new/failed deployment and Vary: Origin.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium, devices } from 'playwright';

const root = resolve('dist');
const workerTemplate = await readFile(join(root, 'sw.js'), 'utf8');
const markerAsset = 'assets/pwa-old-only.txt';
let revision = 0;
let failingAsset = null;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let name = decodeURIComponent(pathname).replace(/^\/+/, '');
  // Serve the exact same production build at both the root and a subpath.
  if (name.startsWith('game/')) name = name.slice('game/'.length);
  if (!name || name.endsWith('/')) name += 'index.html';
  if (name.includes('..')) { res.writeHead(400).end(); return; }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', types[extname(name)] ?? 'application/octet-stream');
  if (name === failingAsset) { res.writeHead(503).end('temporary failure'); return; }
  if (name === markerAsset) { res.writeHead(200).end('old tab asset'); return; }
  if (name === 'sw.js') {
    let script = workerTemplate.replace(/const CACHE_REVISION = '[^']+';/, `const CACHE_REVISION = 'test-${revision}';`);
    if (revision === 0) {
      script = script.replace(/const PRECACHE_PATHS = (\[[^\n]*\]);/, (_, json) =>
        `const PRECACHE_PATHS = ${JSON.stringify([...JSON.parse(json), markerAsset])};`);
    }
    res.writeHead(200).end(script);
    return;
  }
  try {
    const contents = await readFile(join(root, name));
    res.writeHead(200).end(contents);
  } catch { res.writeHead(404).end('not found'); }
});

await new Promise((ok, fail) => {
  server.once('error', fail);
  server.listen(0, '0.0.0.0', ok);
});
const url = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.SQA_CHROMIUM_PATH || undefined });
const problems = [];
const observe = (page) => {
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
};
const suppressNativePrompt = (context) => context.addInitScript(() => {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
});
const waitForController = (page) => page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15_000 });
const progress = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sales-quest-arena:progress:v1')));
const assertNoOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(dimensions.content <= dimensions.viewport, `horizontal overflow: ${JSON.stringify(dimensions)}`);
};

try {
  // Real Chromium checks the manifest, installability, icon dimensions, and offline game.
  const android = await browser.newContext({ ...devices['Pixel 7'], locale: 'fa-IR', reducedMotion: 'reduce' });
  await suppressNativePrompt(android);
  const page = await android.newPage();
  observe(page);
  await page.goto(url);
  await page.waitForSelector('.welcome__card');
  await waitForController(page);
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  await page.setViewportSize({ width: 320, height: 700 });
  await assertNoOverflow(page);
  const cdp = await android.newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  assert.deepEqual(manifest.errors, []);
  assert.equal(manifest.manifest.display, 'kStandalone');
  assert.equal(manifest.manifest.startUrl, url);
  assert.equal(manifest.manifest.id, url);
  assert.equal(manifest.manifest.scope, url);
  const installability = await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors, []);
  const iconSizes = await page.evaluate(async () => {
    const manifest = await (await fetch('manifest.webmanifest')).json();
    return Promise.all(manifest.icons.map((icon) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ declared: icon.sizes, width: image.naturalWidth, height: image.naturalHeight, purpose: icon.purpose });
      image.onerror = reject;
      image.src = icon.src;
    })));
  });
  assert.deepEqual(iconSizes.map(({ declared, width, height }) => [declared, width, height]), [
    ['192x192', 192, 192], ['512x512', 512, 512], ['512x512', 512, 512],
  ]);
  assert.equal(iconSizes[2].purpose, 'maskable');
  assert.equal(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'), './apple-touch-icon.png');
  await page.getByRole('button', { name: 'نصب بازی' }).click();
  assert.match(await page.locator('.install-guide').innerText(), /منوی سه‌نقطه/);
  await assertNoOverflow(page);
  await page.getByRole('button', { name: 'تمام', exact: true }).click();

  const offlineResponses = [];
  page.on('response', (response) => { if (response.fromServiceWorker()) offlineResponses.push(new URL(response.url()).pathname); });
  await android.setOffline(true);
  const offlineLoad = await page.reload();
  assert.equal(offlineLoad.fromServiceWorker(), true);
  await page.waitForSelector('.welcome__card');
  assert.ok(offlineResponses.some((path) => path.endsWith('.js')));
  assert.ok(offlineResponses.some((path) => path.endsWith('.css')));
  await page.locator('.input').fill('علی');
  await page.getByRole('button', { name: 'ورود به میدان' }).click();
  await page.waitForSelector('.map');
  await page.locator('a[href="#/profile"]').click();
  await page.waitForSelector('.profile__hero');
  assert.equal(await page.getByRole('button', { name: 'نصب بازی' }).isVisible(), true);
  await assertNoOverflow(page);
  await page.locator('a[href="#/"]').click();
  await page.waitForSelector('.map');
  await page.locator('.node--available .node__btn').click();
  await page.locator('.detail__cta').click();
  await page.getByRole('radio', { name: /مشتری جدید/ }).click();
  await page.locator('.play__foot .btn--block').click();
  await page.getByRole('radio', { name: /سفارش دریافت شد/ }).click();
  await page.locator('.play__foot .btn--block').click();
  await page.locator('.rating__star').nth(4).click();
  await page.locator('.play__foot .btn--block').click();
  await page.locator('.note__input').fill('یادداشت آفلاین');
  await page.locator('.play__foot .btn--block').click();
  await page.waitForSelector('.result');
  assert.equal((await progress(page)).xp, 180);
  assert.equal((await progress(page)).history[0].answers.note, 'یادداشت آفلاین');
  await page.close();
  const reopened = await android.newPage();
  observe(reopened);
  await reopened.goto(url);
  await reopened.waitForSelector('.map');
  assert.equal(await reopened.locator('.hud__name').innerText(), 'علی');
  assert.equal((await progress(reopened)).xp, 180);
  assert.equal((await progress(reopened)).history[0].answers.note, 'یادداشت آفلاین');
  await assertNoOverflow(reopened);
  await android.close();
  console.log('  ✓ Android manifest, installability, Persian offline play and saved progress');

  // The custom button must invoke a captured browser prompt from a user gesture.
  const promptContext = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' });
  const promptPage = await promptContext.newPage();
  observe(promptPage);
  await promptPage.goto(url);
  await promptPage.waitForSelector('.install-entry');
  const prevented = await promptPage.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', { value: () => { window.__installPromptUsed = true; return Promise.resolve(); } });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(prevented, true);
  await promptPage.getByRole('button', { name: 'Install the game' }).click();
  assert.equal(await promptPage.evaluate(() => window.__installPromptUsed), true);
  await promptPage.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await promptPage.waitForSelector('.install-entry', { state: 'detached' });
  await promptContext.close();
  console.log('  ✓ Native install prompt and installed-state handling');

  // iOS uses Safari's share sheet rather than Chromium's install event.
  const ios = await browser.newContext({ ...devices['iPhone 13'], locale: 'fa-IR', reducedMotion: 'reduce' });
  await suppressNativePrompt(ios);
  const iosPage = await ios.newPage();
  observe(iosPage);
  await iosPage.goto(url);
  await iosPage.getByRole('button', { name: 'نصب بازی' }).click();
  assert.match(await iosPage.locator('.install-guide').innerText(), /سافاری/);
  assert.match(await iosPage.locator('.install-guide').innerText(), /Add to Home Screen/);
  await assertNoOverflow(iosPage);
  await ios.close();
  const installedIos = await browser.newContext({ ...devices['iPhone 13'], locale: 'fa-IR' });
  await installedIos.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  const installedPage = await installedIos.newPage();
  observe(installedPage);
  await installedPage.goto(url);
  await installedPage.waitForSelector('.welcome__card');
  assert.equal(await installedPage.locator('.install-entry').count(), 0);
  await installedIos.close();
  console.log('  ✓ iOS home-screen guidance and standalone detection');

  // Relative manifest, assets, and worker URLs also work below an origin's root.
  const nested = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' });
  const nestedPage = await nested.newPage();
  observe(nestedPage);
  const nestedUrl = `${url}game/`;
  await nestedPage.goto(nestedUrl);
  await nestedPage.waitForSelector('.welcome__card');
  await waitForController(nestedPage);
  assert.equal(await nestedPage.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope), nestedUrl);
  const nestedCdp = await nested.newCDPSession(nestedPage);
  const nestedManifest = await nestedCdp.send('Page.getAppManifest');
  assert.deepEqual(nestedManifest.errors, []);
  assert.equal(nestedManifest.manifest.startUrl, nestedUrl);
  assert.equal(nestedManifest.manifest.scope, nestedUrl);
  assert.deepEqual((await nestedCdp.send('Page.getInstallabilityErrors')).installabilityErrors, []);
  await nested.setOffline(true);
  assert.equal((await nestedPage.reload()).fromServiceWorker(), true);
  await nestedPage.waitForSelector('.welcome__card');
  await nestedPage.locator('.input').fill('Taylor');
  await nestedPage.getByRole('button', { name: 'Enter the arena' }).click();
  await nestedPage.waitForSelector('.map');
  await nestedPage.reload();
  await nestedPage.waitForSelector('.map');
  assert.equal((await progress(nestedPage)).player.name, 'Taylor');
  await nested.close();
  console.log('  ✓ Subpath installation and offline play');

  // Blocking worker access or registration must not break the regular online game.
  for (const block of ['getter', 'register']) {
    const blocked = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' });
    await blocked.addInitScript((method) => {
      const denied = () => { throw new DOMException('Blocked by browser', 'SecurityError'); };
      if (method === 'getter') Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: denied });
      else Object.defineProperty(navigator.serviceWorker, 'register', { configurable: true, value: denied });
    }, block);
    const blockedPage = await blocked.newPage();
    observe(blockedPage);
    await blockedPage.goto(url);
    await blockedPage.waitForSelector('.welcome__card');
    await blockedPage.locator('.input').fill('Jordan');
    await blockedPage.getByRole('button', { name: 'Enter the arena' }).click();
    await blockedPage.waitForSelector('.map');
    assert.equal((await progress(blockedPage)).player.name, 'Jordan');
    await blocked.close();
  }
  console.log('  ✓ Online game remains usable when service workers are blocked');

  // A new version waits during a mission, then offers an explicit update.
  const updateContext = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US', reducedMotion: 'reduce' });
  await suppressNativePrompt(updateContext);
  const updatePage = await updateContext.newPage();
  observe(updatePage);
  await updatePage.goto(url);
  await waitForController(updatePage);
  await updatePage.locator('.input').fill('Alex');
  await updatePage.getByRole('button', { name: 'Enter the arena' }).click();
  await updatePage.waitForSelector('.map');
  await updatePage.locator('.node--available .node__btn').click();
  await updatePage.locator('.detail__cta').click();
  await updatePage.getByRole('radio', { name: /New Customer/ }).click();
  assert.equal((await progress(updatePage)).drafts['customer-visit-challenge'].answers.customer_type, 'new');

  // A failed precache must not activate or replace the working offline version.
  const precache = JSON.parse(workerTemplate.match(/const PRECACHE_PATHS = (\[[^\n]*\]);/)[1]);
  failingAsset = precache.find((path) => path.endsWith('.css'));
  assert.ok(failingAsset);
  revision = 1;
  const failedState = await updatePage.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Failed update did not finish')), 15_000);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'redundant') { clearTimeout(timer); resolve(worker.state); }
        });
      }, { once: true });
      registration.update().catch(reject);
    });
  });
  assert.equal(failedState, 'redundant');
  assert.equal(await updatePage.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting), null);
  assert.ok(!(await updatePage.evaluate(() => caches.keys())).some((name) => name.endsWith('test-1')));
  assert.equal((await progress(updatePage)).player.name, 'Alex');

  failingAsset = null;
  revision = 2;
  await updatePage.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await updatePage.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, null, { timeout: 15_000 });
  assert.equal(await updatePage.locator('.pwa-update').count(), 0, 'no update overlay during a mission');
  await updatePage.getByRole('button', { name: 'Pause mission' }).click();
  await updatePage.getByRole('button', { name: 'Save & exit' }).click();
  await updatePage.waitForSelector('.map');
  await updatePage.waitForSelector('.pwa-update');
  await updatePage.getByRole('button', { name: 'Later', exact: true }).click();
  assert.equal(await updatePage.locator('.pwa-update').count(), 0);
  await updatePage.reload();
  await updatePage.waitForSelector('.pwa-update');
  const reload = updatePage.waitForEvent('load', { timeout: 15_000 });
  await updatePage.getByRole('button', { name: 'Update now' }).click();
  await reload;
  await updatePage.waitForSelector('.map');
  assert.equal((await progress(updatePage)).drafts['customer-visit-challenge'].answers.customer_type, 'new');
  const cacheNames = await updatePage.evaluate(() => caches.keys());
  assert.ok(cacheNames.some((name) => name.endsWith('test-0')));
  assert.ok(cacheNames.some((name) => name.endsWith('test-2')));
  await updateContext.setOffline(true);
  assert.equal(await updatePage.evaluate(async (path) => (await fetch(path)).text(), markerAsset), 'old tab asset');
  await updatePage.reload();
  await updatePage.waitForSelector('.map');
  assert.equal((await progress(updatePage)).player.name, 'Alex');
  await updateContext.close();
  console.log('  ✓ Safe update, no forced mid-mission reload, old assets and drafts retained');

  assert.deepEqual(problems, []);
  console.log('PWA end-to-end checks passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
