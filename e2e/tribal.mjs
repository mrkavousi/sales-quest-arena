/**
 * Gate-off regression and a separate flag-on *production* build. View data is
 * injected only into a separate, explicitly labelled test-only Vite entry.
 *
 * Start the default-off preview first (npm start), then run npm run test:tribal.
 * Set SQA_CHROMIUM_PATH to use an existing Chromium executable.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer as createPortServer } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const offUrl = new URL(process.env.SQA_URL ?? 'http://localhost:4173/');
offUrl.hash = '';
const buildDir = await mkdtemp(join(tmpdir(), 'sqa-tribal-production-'));
let browser;
let server;
let fixtureServer;
const errors = [];
let offline = false;
const observe = (page) => {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !(offline && message.text().includes('ERR_INTERNET_DISCONNECTED'))) errors.push(message.text());
  });
};
const localSave = (page) => page.evaluate(() => localStorage.getItem('sales-quest-arena:progress:v1'));
const noOverflow = async (page) => {
  const { width, content } = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(content <= width, `horizontal overflow: ${content} > ${width}`);
};
const freePort = () => new Promise((ok, fail) => {
  const probe = createPortServer();
  probe.once('error', fail);
  probe.listen(0, '0.0.0.0', () => {
    const port = probe.address().port;
    probe.close((error) => error ? fail(error) : ok(port));
  });
});
const buildEnabled = () => new Promise((ok, fail) => {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', buildDir, '--emptyOutDir'], {
    cwd: process.cwd(), env: { ...process.env, VITE_TRIBAL_ENABLED: 'true', VITE_GAME_MODE: 'local' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  child.once('error', fail);
  child.once('close', (code) => code === 0 ? ok() : fail(new Error(`Flag-on production build failed (${code}):\n${output}`)));
});

try {
  await buildEnabled();
  const worker = await readFile(join(buildDir, 'sw.js'), 'utf8');
  // Test-only fixture entries and markers must never be published with the enabled build.
  assert.ok(!(await readdir(buildDir)).includes('e2e'));
  for (const file of await readdir(join(buildDir, 'assets'))) {
    if (!file.endsWith('.js')) continue;
    const contents = await readFile(join(buildDir, 'assets', file), 'utf8');
    assert.ok(!contents.includes('SQA_TEST_ONLY_PRIVATE_PLAYER'));
    assert.ok(!contents.includes('SQA_TEST_ONLY_PRIVATE_AVATAR'));
    assert.ok(!contents.includes('SQA_BROWSER_ONLY_PRIVATE_NAME'));
    assert.ok(!contents.includes('Test fixture — sample data'));
  }

  let revision = 0;
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  server = createServer(async (request, response) => {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const file = resolve(buildDir, name);
    if (!file.startsWith(`${resolve(buildDir)}${sep}`)) { response.writeHead(403).end(); return; }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    try {
      if (name === 'sw.js') {
        response.end(worker.replace(/const CACHE_REVISION = '[^']+';/, `const CACHE_REVISION = 'tribal-test-${revision}';`));
      } else response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '0.0.0.0', ok); });
  const enabledUrl = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ executablePath: process.env.SQA_CHROMIUM_PATH || undefined });

  // Default-off: the entry is absent, and the former unknown hash still leads
  // to the original onboarding and arena instead of exposing the new shell.
  const offContext = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const offPage = await offContext.newPage();
  observe(offPage);
  await offPage.goto(`${offUrl.href}#/tribal`);
  await offPage.locator('.welcome__card').waitFor();
  assert.equal(await offPage.getByRole('link', { name: 'Tribal overview' }).count(), 0);
  assert.equal(await offPage.locator('.tribal-page').count(), 0);
  await offPage.locator('.input').fill('Gate off');
  await offPage.getByRole('button', { name: 'Enter the arena' }).click();
  await offPage.locator('.map').waitFor();
  assert.equal(await offPage.locator('.node__btn').count(), 6);
  const offSave = await localSave(offPage);
  await offPage.evaluate(() => { window.location.hash = '/tribal'; });
  await offPage.locator('.map').waitFor();
  assert.equal(await offPage.locator('.tribal-page').count(), 0);
  assert.equal(await localSave(offPage), offSave);
  await offContext.close();
  console.log('  ✓ Default-off entry, legacy fallback, onboarding, six missions and save');

  // Test-only Vite entry receives its view data from this script, never from
  // a production bundle. Exercise the actual DOM, not just static markup.
  const previousFlag = process.env.VITE_TRIBAL_ENABLED;
  process.env.VITE_TRIBAL_ENABLED = 'true';
  fixtureServer = await createViteServer({ logLevel: 'error', server: { host: '0.0.0.0', port: await freePort(), strictPort: true } });
  await fixtureServer.listen();
  const fixturePort = fixtureServer.httpServer.address().port;
  const fixtureContext = await browser.newContext({ locale: 'fa-IR', viewport: { width: 320, height: 700 }, reducedMotion: 'reduce' });
  const fixturePage = await fixtureContext.newPage();
  observe(fixturePage);
  await fixturePage.goto(`http://127.0.0.1:${fixturePort}/e2e/tribal-view-fixture.html`);
  await fixturePage.waitForFunction(() => typeof window.renderTribalFixture === 'function');
  const makeUnit = (depth) => ({
    id: `depth-${depth}`,
    label: `واحد آزمایشی ${depth} — نام بسیار طولانی برای بررسی نمایش`,
    ...(depth ? { children: [makeUnit(depth - 1)] } : { players: [
      { id: 'one', name: 'SQA_BROWSER_ONLY_PRIVATE_NAME', avatar: { src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, points: 987654, rank: 12345 },
      { id: 'two', name: 'Sample player two', points: 0, rank: 0 },
      { id: 'three', name: 'Sample player three', points: 42 },
    ] }),
  });
  const fixture = {
    units: [makeUnit(31), { id: 'sibling-one', label: 'واحد همکار یک' }, { id: 'sibling-two', label: 'واحد همکار دو' }],
    visibility: { name: true, avatar: false, points: false, rank: true },
  };
  await fixturePage.evaluate((view) => window.renderTribalFixture(view, 'fa'), fixture);
  await fixturePage.getByText('SQA_BROWSER_ONLY_PRIVATE_NAME').waitFor();
  assert.equal(await fixturePage.getByText('Test fixture — sample data').isVisible(), true);
  assert.equal(await fixturePage.locator('.tribal-tree__unit').count(), 34);
  assert.equal(await fixturePage.locator('.tribal-player').count(), 3);
  assert.equal(await fixturePage.locator('.tribal-player img').count(), 0);
  assert.ok(!(await fixturePage.locator('body').innerText()).includes('۹۸۷۶۵۴'));
  assert.ok((await fixturePage.locator('body').innerText()).includes('۱۲۳۴۵'));
  await noOverflow(fixturePage);
  fixture.visibility = { name: false, avatar: true, points: true, rank: false };
  await fixturePage.evaluate((view) => window.renderTribalFixture(view, 'fa'), fixture);
  await fixturePage.locator('.tribal-player img').waitFor();
  const privateHtml = await fixturePage.locator('body').innerHTML();
  assert.ok(!privateHtml.includes('SQA_BROWSER_ONLY_PRIVATE_NAME'));
  assert.ok(!privateHtml.includes('۱۲۳۴۵'));
  assert.ok(privateHtml.includes('۹۸۷۶۵۴'));
  await noOverflow(fixturePage);
  await fixturePage.setViewportSize({ width: 1280, height: 800 });
  await noOverflow(fixturePage);
  await fixtureContext.close();
  await fixtureServer.close();
  fixtureServer = undefined;
  if (previousFlag === undefined) delete process.env.VITE_TRIBAL_ENABLED;
  else process.env.VITE_TRIBAL_ENABLED = previousFlag;
  console.log('  ✓ Test-injected variable hierarchy and explicit field visibility in responsive RTL');

  // Enabled production build: no login or game identity is required for the
  // neutral shell, and a partially filled onboarding screen remains mounted.
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  observe(page);
  const apiRequests = [];
  page.on('request', (request) => { if (['fetch', 'xhr'].includes(request.resourceType())) apiRequests.push(request.url()); });
  await page.goto(enabledUrl);
  await page.locator('.welcome__card').waitFor();
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15_000 });
  await page.locator('.input').fill('Unfinished onboarding');
  const initialSave = await localSave(page);
  await page.getByRole('link', { name: 'Tribal overview' }).click();
  await page.getByRole('heading', { name: 'Tribal overview' }).waitFor();
  assert.equal(await page.getByRole('status').filter({ hasText: 'Not connected' }).isVisible(), true);
  assert.equal(await page.locator('.tribal-player, .tribal-tree').count(), 0);
  assert.equal(await page.locator('.welcome__card').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement?.matches('.tribal-page')), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Back to game');
  assert.equal(await localSave(page), initialSave);
  assert.deepEqual(apiRequests, [], 'the local-mode Tribal shell must not issue API requests');

  // The unchanged PWA update notice still appears on the new route.
  revision = 1;
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, null, { timeout: 15_000 });
  await page.locator('.pwa-update').waitFor();
  assert.equal(await page.locator('.pwa-update').isVisible(), true);
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  assert.equal(await page.locator('.tribal-page').isVisible(), true);

  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole('button', { name: 'فارسی', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.equal(await page.getByRole('heading', { name: 'نمای کلی ایل' }).isVisible(), true);
  await noOverflow(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await noOverflow(page);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('link', { name: 'Back to game' }).click();
  assert.equal(await page.locator('.input').inputValue(), 'Unfinished onboarding');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Tribal overview');
  await page.getByRole('button', { name: 'Enter the arena' }).click();
  await page.locator('.map').waitFor();
  assert.equal(await page.locator('.node__btn').count(), 6);
  const progress = await localSave(page);
  await page.locator('a[href="#/missions"]').click();
  await page.locator('.mcard').first().waitFor();
  assert.equal(await page.locator('.mcard').count(), 6);
  await page.locator('a[href="#/history"]').click();
  await page.getByRole('heading', { name: 'Mission History' }).waitFor();
  await page.locator('a[href="#/profile"]').click();
  await page.locator('.profile__hero').waitFor();
  await page.getByRole('link', { name: 'Tribal overview' }).click();
  await page.getByRole('link', { name: 'Back to game' }).click();
  await page.locator('.profile__hero').waitFor();
  assert.equal(await localSave(page), progress, 'visiting the shell does not change the existing save');
  console.log('  ✓ Enabled production shell, no fixtures/API, onboarding preservation, RTL, keyboard and unchanged PWA update');

  // A portaled game sheet and an active mission must never be unmounted by an
  // external hash change. The attempt is rejected with an accessible message.
  await page.locator('a[href="#/"]').click();
  await page.locator('.map').waitFor();
  await page.locator('.node--available .node__btn').click();
  await page.locator('.sheet').waitFor();
  await page.evaluate(() => { window.location.hash = '/tribal'; });
  await page.locator('.tribal-guard').getByText('Close the open dialog before opening the Tribal overview.').waitFor();
  assert.equal(await page.locator('.sheet').isVisible(), true);
  assert.equal(await page.locator('.tribal-page').count(), 0);
  await page.locator('.tribal-guard').getByRole('button', { name: 'Close' }).click();
  await page.locator('.detail__cta').click();
  await page.locator('.play').waitFor();
  await page.getByRole('radio', { name: /New Customer/ }).click();
  const draft = await localSave(page);
  assert.equal(await page.getByRole('link', { name: 'Tribal overview' }).count(), 0);
  await page.evaluate(() => { window.location.hash = '/tribal'; });
  await page.locator('.tribal-guard').getByText('Finish or save and exit your mission before opening the Tribal overview.').waitFor();
  await page.waitForURL('**/#/play/customer-visit-challenge');
  assert.equal(await page.locator('.play').isVisible(), true);
  assert.equal(await page.getByRole('radio', { name: /New Customer/ }).getAttribute('aria-checked'), 'true');
  assert.equal(await localSave(page), draft);
  assert.equal(await page.locator('.tribal-page').count(), 0);
  await page.locator('.tribal-guard').getByRole('button', { name: 'Close' }).click();
  await page.evaluate(() => { window.location.hash = '/tribal/not-a-page'; });
  await page.locator('.tribal-guard').getByText('Finish or save and exit your mission before opening the Tribal overview.').waitFor();
  await page.waitForURL('**/#/play/customer-visit-challenge');
  assert.equal(await page.getByRole('radio', { name: /New Customer/ }).getAttribute('aria-checked'), 'true');
  await page.locator('.tribal-guard').getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Pause mission' }).click();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await page.locator('.map').waitFor();
  const savedDraft = await localSave(page);
  await page.getByRole('link', { name: 'Tribal overview' }).click();
  await page.getByRole('link', { name: 'Back to game' }).click();
  assert.equal(await localSave(page), savedDraft);
  // A real history-back transition to a Tribal hash is also rejected while
  // resuming a mission; it must keep the mounted answers, not just the URL.
  await page.getByRole('link', { name: 'Tribal overview' }).click();
  await page.evaluate(() => { window.location.hash = '/play/customer-visit-challenge'; });
  await page.locator('.play').waitFor();
  assert.equal(await page.getByRole('radio', { name: /New Customer/ }).getAttribute('aria-checked'), 'true');
  await page.evaluate(() => window.history.back());
  await page.locator('.tribal-guard').getByText('Finish or save and exit your mission before opening the Tribal overview.').waitFor();
  await page.waitForURL('**/#/play/customer-visit-challenge');
  assert.equal(await page.getByRole('radio', { name: /New Customer/ }).getAttribute('aria-checked'), 'true');
  await page.locator('.tribal-guard').getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Pause mission' }).click();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await page.locator('.map').waitFor();
  console.log('  ✓ Open-dialog and active-draft guards preserve the existing game');

  // Only the shell is available offline; it never invents player data.
  await page.getByRole('link', { name: 'Tribal overview' }).click();
  const offlineSave = await localSave(page);
  offline = true;
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Tribal overview' }).waitFor();
  assert.equal(await page.getByText('Not connected', { exact: true }).isVisible(), true);
  assert.equal(await page.locator('.tribal-player, .tribal-tree').count(), 0);
  assert.equal(await localSave(page), offlineSave);
  await context.setOffline(false);
  offline = false;
  await context.close();
  assert.deepEqual(errors, []);
  console.log('  ✓ Offline shell remains neutral and the local game save survives');
  console.log('Tribal scaffold end-to-end checks passed.');
} finally {
  await browser?.close();
  await fixtureServer?.close();
  if (server) await new Promise((ok) => server.close(ok));
  await rm(buildDir, { recursive: true, force: true });
}
