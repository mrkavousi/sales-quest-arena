/**
 * Cross-repository browser test against the real FastAPI BFF and a fresh demo DB.
 *
 * SQA_BACKEND_DIR=/path/to/comu-center \
 * SQA_BACKEND_PYTHON=/path/to/venv/bin/python \
 * SQA_CHROMIUM_PATH=/path/to/chromium npm run test:bff
 *
 * Requires backend main at 0bd8707 or later (the JSON `/api/v1/game/demo-users`,
 * `/demo-login` and `/logout` routes), with dependencies installed. No external service, production database, or real identity is used.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const backend = process.env.SQA_BACKEND_DIR;
if (!backend) throw new Error('Set SQA_BACKEND_DIR to a checkout of iciiex/comu-center with the game BFF.');
const pythonPath = process.env.SQA_BACKEND_PYTHON ?? 'python3';
const python = pythonPath.includes('/') ? resolve(pythonPath) : pythonPath;
const temp = await mkdtemp(join(tmpdir(), 'sqa-bff-e2e-'));
const processes = [];
const logs = [];
const freePort = () => new Promise((ok, fail) => {
  const server = createServer();
  server.once('error', fail);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close((error) => error ? fail(error) : ok(port));
  });
});
const start = (command, args, options) => {
  const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
  processes.push(child);
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));
  child.on('error', (error) => logs.push(`Failed to start ${command}: ${error.message}\n`));
  return child;
};
const waitForHttp = async (url, child) => {
  for (let i = 0; i < 150; i += 1) {
    if (child.exitCode !== null || !child.pid) throw new Error(`Process failed: ${logs.join('').slice(-3000)}`);
    try { const response = await fetch(url); if (response.ok) return; } catch { /* starting */ }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}: ${logs.join('').slice(-3000)}`);
};

let browser;
try {
  const backendPort = await freePort();
  let frontendPort = await freePort();
  while (frontendPort === backendPort) frontendPort = await freePort();
  const api = start(python, ['-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '0.0.0.0', '--port', String(backendPort)], {
    cwd: resolve(backend),
    env: { ...process.env, KILOOS_ENV: 'test', KILOOS_DB: join(temp, 'demo.sqlite'), KILOOS_EVIDENCE_DIR: join(temp, 'evidence'), KILOOS_SECRET: 'test-secret-that-is-long-enough-1234567890' },
  });
  await waitForHttp(`http://127.0.0.1:${backendPort}/health`, api);
  const web = start(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', String(frontendPort), '--strictPort'], {
    cwd: process.cwd(), env: { ...process.env, VITE_GAME_MODE: 'server', GAME_BFF_TARGET: `http://127.0.0.1:${backendPort}` },
  });
  const base = `http://127.0.0.1:${frontendPort}/`;
  await waitForHttp(base, web);
  browser = await chromium.launch({ executablePath: process.env.SQA_CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', reducedMotion: 'reduce', timezoneId: 'Pacific/Pago_Pago' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  const legacy = JSON.stringify({
    version: 1, player: { name: 'Legacy', avatar: 'frog', onboarded: true, createdAt: '2025-01-01T00:00:00Z' },
    xp: 987, coins: 123, streak: { count: 0, best: 0, lastActiveDate: null }, missions: {}, drafts: {}, daily: null, achievements: {}, history: [],
  });
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('sqa-e2e-seeded')) {
      localStorage.setItem('sales-quest-arena:progress:v1', saved);
      localStorage.setItem('sales-quest-arena:mode:v1', 'server');
      localStorage.setItem('sqa-e2e-seeded', 'yes');
    }
  }, legacy);
  const bootstrap = () => page.evaluate(async () => {
    const response = await fetch('/api/v1/game/bootstrap', { cache: 'no-store' });
    assertResponse(response);
    return response.json();
    function assertResponse(result) { if (!result.ok) throw new Error(`bootstrap: ${result.status}`); }
  });
  const localSave = () => page.evaluate(() => localStorage.getItem('sales-quest-arena:progress:v1'));
  const selectVisitor = async (index, tab = page, expectPending = false) => {
    await tab.getByText('Choose a demo visitor').waitFor();
    await tab.locator('.connection-gate select').waitFor();
    const options = tab.locator('.connection-gate select option');
    assert.equal(await options.count(), 3, 'only the three visitor accounts are offered');
    const ids = await options.evaluateAll((nodes) => nodes.map((node) => node.value));
    await tab.locator('.connection-gate select').selectOption(ids[index]);
    await tab.getByRole('button', { name: 'Sign in to demo' }).click();
    if (expectPending) await tab.getByText('Check the last completion').waitFor();
    else await tab.waitForFunction(() => !document.querySelector('.connection-gate'));
    assert.equal(new URL(tab.url()).search, '', 'JSON demo sign-in never puts a session token in the URL');
    return ids[index];
  };

  await page.goto(base);
  await page.getByText('Choose a demo visitor').waitFor();
  const anonymous = await page.evaluate(async () => {
    const response = await fetch('/api/v1/game/bootstrap');
    return { status: response.status, data: await response.json() };
  });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.data.error.code, 'AUTHENTICATION_REQUIRED');
  const firstId = await selectVisitor(0);
  const cookie = (await context.cookies()).find((item) => item.name === 'kiloos_session');
  assert.ok(cookie?.httpOnly && cookie.sameSite === 'Lax');
  assert.equal(await localSave(), legacy, 'server boot must not alter the existing local save');
  assert.equal(await page.evaluate((token) => JSON.stringify(localStorage).includes(token), cookie.value), false, 'session token is not placed in localStorage');
  let state = await bootstrap();
  assert.equal(state.player.id, firstId);
  assert.equal(state.api_version, '1');
  assert.equal(state.missions.length, 6);
  assert.equal(state.progress.xp, 0);
  assert.equal(state.date_key, new Date(state.server_time).toISOString().slice(0, 10));
  assert.equal(state.progress.daily.date, state.date_key);
  const dailyTitle = state.missions.find((mission) => mission.isDaily).title;
  assert.equal(await page.getByText('Server game · demo account', { exact: false }).count() > 0, true);

  const patchRequests = [];
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && request.url().endsWith('/api/v1/game/profile')) patchRequests.push(request);
  });
  await page.locator('.welcome__card .input').fill('Server Alex');
  await page.getByRole('button', { name: 'Enter the arena' }).click();
  await page.waitForSelector('.map');
  assert.equal(await page.locator('.hud__name').innerText(), 'Server Alex');
  assert.equal(await page.locator('.daily__title').innerText(), dailyTitle, 'daily challenge comes from the server UTC day');
  assert.deepEqual(Object.keys(patchRequests.at(-1).postDataJSON()).sort(), ['avatar', 'name']);
  assert.ok(patchRequests.at(-1).headers()['x-csrf-token']);
  assert.equal(await page.getByText('UTC server day').count() > 0, true);

  // Save and resume a draft through the real BFF, including after a reload.
  await page.goto(`${base}#/play/customer-visit-challenge`);
  await page.waitForSelector('.play');
  await page.getByRole('radio', { name: /New Customer/ }).click();
  await page.getByRole('button', { name: 'Pause mission' }).click();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await page.waitForSelector('.map');
  state = await bootstrap();
  assert.equal(state.progress.drafts['customer-visit-challenge'].answers.customer_type, 'new');
  await page.reload();
  await page.waitForSelector('.map');
  await page.goto(`${base}#/play/customer-visit-challenge`);
  await page.waitForSelector('.play');
  assert.equal(await page.getByRole('radio', { name: /New Customer/ }).getAttribute('aria-checked'), 'true');
  console.log('  ✓ Demo cookie login, server profile, UTC bootstrap and draft reload');

  // Even an already-autosaved draft must not show a successful save-and-exit
  // after a failed connectivity/identity refresh when there are no new edits.
  const offlineDuringPlay = (route) => route.abort('failed');
  await page.route('**/api/v1/game/bootstrap', offlineDuringPlay);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText('Not confirmed by the server. Changes may be lost.').waitFor();
  await page.getByRole('button', { name: 'Pause mission' }).click();
  const failedBoot = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/api/v1/game/bootstrap'));
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await failedBoot;
  assert.equal(await page.locator('.play').count(), 1, 'an offline no-op must not claim a successful save-and-exit');
  await page.unroute('**/api/v1/game/bootstrap', offlineDuringPlay);
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await page.waitForSelector('.map');
  await page.goto(`${base}#/play/customer-visit-challenge`);
  await page.waitForSelector('.play');
  assert.equal(await page.getByRole('radio', { name: /New Customer/ }).getAttribute('aria-checked'), 'true');
  console.log('  ✓ Save-and-exit confirms connectivity even with no new draft changes');

  // A deployment can become incompatible after the initial bootstrap. Keep the
  // visible draft, explain the problem and block writes until a compatible boot.
  const incompatibleBootstrap = async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.content_version = 'unsupported-test-version';
    await route.fulfill({ response, json: data });
  };
  let draftWrites = 0;
  const countDraftWrites = (request) => {
    if (['PUT', 'DELETE'].includes(request.method()) && request.url().endsWith('/draft')) draftWrites += 1;
  };
  page.on('request', countDraftWrites);
  await page.route('**/api/v1/game/bootstrap', incompatibleBootstrap);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText(/The server API or mission catalog version is not compatible/).waitFor();
  const attemptedBoot = page.waitForResponse((response) => response.url().endsWith('/api/v1/game/bootstrap'));
  await page.getByRole('radio', { name: /Existing Customer/ }).click();
  await attemptedBoot;
  await page.getByRole('button', { name: 'Pause mission' }).click();
  const discardBoot = page.waitForResponse((response) => response.url().endsWith('/api/v1/game/bootstrap'));
  await page.getByRole('button', { name: 'Quit and discard answers' }).click();
  await discardBoot;
  await page.getByRole('button', { name: 'Quit and discard answers' }).waitFor();
  const exitBoot = page.waitForResponse((response) => response.url().endsWith('/api/v1/game/bootstrap'));
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await exitBoot;
  assert.equal(draftWrites, 0, 'known incompatible versions must not receive draft writes or deletes');
  assert.equal(await page.locator('.play').count(), 1, 'an incompatible save must not exit the mission');
  assert.equal(await page.getByRole('radio', { name: /Existing Customer/, includeHidden: true }).getAttribute('aria-checked'), 'true');
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await page.unroute('**/api/v1/game/bootstrap', incompatibleBootstrap);
  const savedAfterCompatibility = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().endsWith('/draft'));
  await page.locator('.play__sync').getByRole('button', { name: 'Try again' }).click();
  assert.equal((await savedAfterCompatibility).status(), 200);
  await page.locator('.play__sync').waitFor({ state: 'hidden' });
  state = await bootstrap();
  assert.equal(state.progress.drafts['customer-visit-challenge'].answers.customer_type, 'existing');
  const restoreDraft = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().endsWith('/draft'));
  await page.getByRole('radio', { name: /New Customer/ }).click();
  assert.equal((await restoreDraft).status(), 200);
  await page.locator('.play__sync').waitFor({ state: 'hidden' });
  page.off('request', countDraftWrites);
  console.log('  ✓ Mid-session contract changes pause writes without losing the visible draft');

  // Failed draft writes must not claim to be saved or allow Save & exit to lose answers.
  const draftRoute = async (route) => route.request().method() === 'PUT' ? route.abort('failed') : route.continue();
  await page.route('**/api/v1/game/missions/*/draft', draftRoute);
  await page.getByRole('radio', { name: /Existing Customer/ }).click();
  await page.getByRole('button', { name: 'Pause mission' }).click();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await page.getByText('Not confirmed by the server. Changes may be lost.').waitFor();
  assert.equal(await page.locator('.play').count(), 1, 'failed save stays in the mission');

  // A cookie can change in another tab while this tab has unsaved answers.
  // Keep those answers in place instead of silently replacing the session.
  const signer = await context.newPage();
  await signer.goto(`${base}#/profile`);
  await signer.waitForSelector('.profile__hero');
  await signer.getByRole('button', { name: 'Change demo account' }).click();
  await selectVisitor(1, signer);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText(/Unsaved answers are still on this screen/).waitFor();
  assert.equal(await page.getByRole('radio', { name: /Existing Customer/ }).getAttribute('aria-checked'), 'true');
  await signer.bringToFront();
  await signer.getByRole('button', { name: 'Change demo account' }).click();
  await selectVisitor(0, signer);
  await page.unroute('**/api/v1/game/missions/*/draft', draftRoute);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText(/Unsaved answers are still on this screen/).waitFor({ state: 'hidden' });
  await signer.close();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await page.waitForSelector('.map');
  state = await bootstrap();
  assert.equal(state.progress.drafts['customer-visit-challenge'].answers.customer_type, 'existing');

  // A failed discard must not drop the still-visible unsaved answers either.
  await page.goto(`${base}#/play/customer-visit-challenge`);
  await page.waitForSelector('.play');
  const failedDelete = async (route) => {
    if (route.request().method() === 'DELETE') {
      const response = await route.fetch();
      assert.equal(response.status(), 200); // discard committed, but the reply is lost
    }
    await route.abort('failed');
  };
  await page.route('**/api/v1/game/missions/*/draft', failedDelete);
  await page.getByRole('radio', { name: /New Customer/ }).click();
  await page.getByRole('button', { name: 'Pause mission' }).click();
  await page.getByRole('button', { name: 'Quit and discard answers' }).click();
  await page.getByText('Not confirmed by the server. Changes may be lost.').waitFor();
  assert.equal(await page.locator('.play').count(), 1);
  await page.unroute('**/api/v1/game/missions/*/draft', failedDelete);
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await page.waitForSelector('.map');
  state = await bootstrap();
  assert.equal(state.progress.drafts['customer-visit-challenge'].answers.customer_type, 'new');
  console.log('  ✓ Failed draft saves/discards preserve answers and never claim a false exit');

  await page.goto(`${base}#/play/customer-visit-challenge`);
  await page.waitForSelector('.play');
  await page.locator('.play__foot .btn--block').click();
  await page.getByRole('radio', { name: /Order Received/ }).click();
  await page.locator('.play__foot .btn--block').click();
  await page.locator('.rating__star').nth(4).click();
  await page.locator('.play__foot .btn--block').click();
  await page.locator('.note__input').fill('Server-only note');
  let firstRequest;
  let firstResponse;
  const lostResponse = async (route) => {
    firstRequest = { key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON(), csrf: route.request().headers()['x-csrf-token'] };
    const response = await route.fetch();
    assert.equal(response.status(), 200);
    firstResponse = await response.json();
    await route.abort('failed'); // backend committed; the browser never received the response
  };
  await page.route('**/api/v1/game/missions/*/completions', lostResponse);
  await page.locator('.play__foot .btn--block').click();
  await page.getByText('Check the last completion').waitFor({ timeout: 20_000 });
  assert.equal(await page.locator('.result').count(), 0, 'an uncertain completion never displays rewards');
  assert.ok(firstRequest.key && firstRequest.csrf);
  assert.deepEqual(Object.keys(firstRequest.body), ['answers']);
  assert.equal(firstRequest.body.answers.note, 'Server-only note');
  state = await bootstrap();
  assert.equal(state.progress.xp, firstResponse.entry.rewards.xp, 'the simulated lost response really did reach the backend');
  const pending = await page.evaluate(() => Object.keys(localStorage).find((key) => key.startsWith('sales-quest-arena:pending-completion:v1:')));
  assert.ok(pending, 'retry key survives a reload');
  assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), pending)).key, firstRequest.key);
  assert.equal(await localSave(), legacy, 'server play never changes device-only XP or history');
  await page.getByRole('button', { name: 'Change demo account' }).click();
  await selectVisitor(1);
  assert.equal((await bootstrap()).progress.xp, 0, 'another visitor must not inherit the pending completion');
  await page.getByRole('button', { name: 'Change demo account' }).click();
  await selectVisitor(0, page, true);
  assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), pending)).key, firstRequest.key);
  await page.reload();
  await page.getByText('Check the last completion').waitFor();
  await page.unroute('**/api/v1/game/missions/*/completions', lostResponse);
  // Validation happens before idempotency lookup in the BFF. A rejected retry
  // does not prove the earlier uncertain request was not already committed.
  const rejectRetry = (route) => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INVALID_ANSWERS', message: 'test' } }) });
  await page.route('**/api/v1/game/missions/*/completions', rejectRetry);
  await page.getByRole('button', { name: 'Retry the same completion' }).click();
  await page.getByText(/The retry was rejected, but the earlier attempt may have succeeded/).waitFor();
  assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), pending)).key, firstRequest.key);
  await page.unroute('**/api/v1/game/missions/*/completions', rejectRetry);

  // A pending retry is also blocked by a known incompatible contract; it must
  // keep the exact recovery key and must not send an unverified completion.
  let blockedPosts = 0;
  const countBlockedPosts = (request) => { if (request.method() === 'POST' && request.url().endsWith('/completions')) blockedPosts += 1; };
  page.on('request', countBlockedPosts);
  await page.route('**/api/v1/game/bootstrap', incompatibleBootstrap);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText(/The server API or mission catalog version is not compatible/).waitFor();
  const recoveryBoot = page.waitForResponse((response) => response.url().endsWith('/api/v1/game/bootstrap'));
  await page.getByRole('button', { name: 'Retry the same completion' }).click();
  await recoveryBoot;
  await page.getByRole('button', { name: 'Retry the same completion' }).waitFor();
  assert.equal(blockedPosts, 0);
  assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), pending)).key, firstRequest.key);
  await page.unroute('**/api/v1/game/bootstrap', incompatibleBootstrap);
  page.off('request', countBlockedPosts);

  // Another independent run may have been recorded since the lost response.
  // A replay returns its original projection, so the app must refresh before
  // displaying canonical totals rather than rolling them back to that snapshot.
  const newer = await page.evaluate(async () => {
    const boot = await (await fetch('/api/v1/game/bootstrap')).json();
    const response = await fetch('/api/v1/game/missions/customer-visit-challenge/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': boot.csrf_token, 'Idempotency-Key': 'independent-test-run' },
      body: JSON.stringify({ answers: { customer_type: 'new', outcome: 'successful_meeting', rating: 3 } }),
    });
    if (!response.ok) throw new Error(`independent run: ${response.status}`);
    return response.json();
  });
  assert.equal(newer.progress.missions['customer-visit-challenge'].completions, 2);
  let retryRequest;
  let replayHeader;
  let clientReplayHeader;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/completions')) retryRequest = { key: request.headers()['idempotency-key'], body: request.postDataJSON() };
  });
  page.on('response', (response) => {
    if (response.request().method() === 'POST' && response.url().endsWith('/completions')) clientReplayHeader = response.headers()['idempotent-replay'] ?? null;
  });
  // Simulate a proxy stripping the replay header. The confirmed entry is usable,
  // but the old projection must not replace newer progress when refresh fails.
  const stripReplayHeader = async (route) => {
    const response = await route.fetch();
    const headers = response.headers();
    replayHeader = headers['idempotent-replay'];
    delete headers['idempotent-replay'];
    await route.fulfill({ response, headers });
  };
  await page.route('**/api/v1/game/missions/*/completions', stripReplayHeader);
  // The pre-retry bootstrap is compatible, but the refresh after the confirmed
  // replay changes version. The result stays confirmed while stale totals warn.
  const badPostCompletionBoot = async (route) => {
    const response = await route.fetch();
    if (!retryRequest) return route.fulfill({ response });
    const data = await response.json();
    data.content_version = 'unsupported-after-replay';
    await route.fulfill({ response, json: data });
  };
  await page.route('**/api/v1/game/bootstrap', badPostCompletionBoot);
  await page.getByRole('button', { name: 'Retry the same completion' }).click();
  await page.waitForSelector('.result');
  assert.deepEqual(retryRequest, { key: firstRequest.key, body: firstRequest.body });
  assert.equal(replayHeader, 'true');
  assert.equal(clientReplayHeader, null, 'the browser really received no replay header');
  await page.locator('.result__sync').getByText(/The completion was confirmed/).waitFor();
  assert.match(await page.locator('.result__sync').innerText(), /not compatible/);
  assert.match(await page.locator('.result__total').innerText(), /XP after this mission/);
  const resultHash = await page.evaluate(() => window.location.hash);
  await page.evaluate(() => { window.location.hash = '#/'; });
  await page.waitForSelector('.hud');
  await page.waitForFunction((xp) => Number(document.querySelector('.hud__xp-num b')?.textContent) === xp, newer.progress.xp);
  await page.locator('.connection-banner').getByText(/The server API or mission catalog version is not compatible/).waitFor();
  await page.evaluate((hash) => { window.location.hash = hash; }, resultHash);
  await page.waitForSelector('.result__sync');
  await page.unroute('**/api/v1/game/bootstrap', badPostCompletionBoot);
  await page.unroute('**/api/v1/game/missions/*/completions', stripReplayHeader);
  await page.locator('.result__sync').getByRole('button', { name: 'Try again' }).click();
  await page.locator('.result__sync').waitFor({ state: 'hidden' });
  state = await bootstrap();
  assert.equal(state.progress.xp, newer.progress.xp, 'retry awards no second XP');
  assert.equal(state.progress.missions['customer-visit-challenge'].completions, 2);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), pending), null);
  await page.goto(`${base}#/`);
  await page.waitForSelector('.hud');
  await page.waitForFunction((xp) => Number(document.querySelector('.hud__xp-num b')?.textContent) === xp, newer.progress.xp);
  console.log('  ✓ Lost response + reload replays once and refreshes a newer canonical projection');

  // Seed enough additional independent runs to exercise the real history cursor.
  await page.evaluate(async () => {
    const boot = await (await fetch('/api/v1/game/bootstrap')).json();
    for (let i = 0; i < 20; i += 1) {
      const response = await fetch('/api/v1/game/missions/customer-visit-challenge/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': boot.csrf_token, 'Idempotency-Key': `history-test-${i}` },
        body: JSON.stringify({ answers: { customer_type: 'existing', outcome: 'successful_meeting', rating: 3 } }),
      });
      if (!response.ok) throw new Error(`history setup: ${response.status}`);
    }
  });
  await page.goto(`${base}#/history`);
  await page.waitForSelector('.hcard');
  await page.getByRole('button', { name: 'Load more history' }).waitFor();
  assert.equal(await page.locator('.hcard').count(), 20);
  await page.getByRole('button', { name: 'Load more history' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.hcard').length === 22);
  assert.match(await page.locator('.hlist').innerText(), /Server-only note/);
  assert.equal(await page.getByText('UTC server day').count() > 0, true);
  await page.goto(`${base}#/profile`);
  await page.waitForSelector('.profile__hero');
  const otherTab = await context.newPage();
  otherTab.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await otherTab.goto(base);
  await otherTab.waitForSelector('.hud');
  assert.equal(await otherTab.locator('.hud__name').innerText(), 'Server Alex');
  await page.getByRole('button', { name: 'Change demo account' }).click();
  const secondId = await selectVisitor(1);
  assert.notEqual(secondId, firstId);
  state = await bootstrap();
  assert.equal(state.player.id, secondId);
  assert.equal(state.progress.xp, 0, 'server progress is isolated by account');
  assert.equal(state.progress.history.length, 0);
  assert.equal(await localSave(), legacy);
  await otherTab.bringToFront();
  await otherTab.evaluate(() => window.dispatchEvent(new Event('focus')));
  await otherTab.waitForSelector('.welcome__card');
  assert.equal(await otherTab.locator('.hud').count(), 0, 'a focused tab does not display the old account under the new cookie');
  const tabIdentity = await otherTab.evaluate(async () => (await (await fetch('/api/v1/game/bootstrap')).json()).player.id);
  assert.equal(tabIdentity, secondId);
  await otherTab.close();

  // A second visitor may not have onboarded on the shared demo database, so
  // pass the welcome screen when it appears; the profile keeps the Sign out
  // action either way.
  await page.goto(`${base}#/profile`);
  await page.waitForSelector('.welcome__card, .profile__hero');
  if (!(await page.locator('.profile__hero').count())) {
    await page.locator('.welcome__card .input').fill('Server Bea');
    await page.getByRole('button', { name: 'Enter the arena' }).click();
    await page.waitForSelector('.profile__hero', { timeout: 20_000 });
  }

  // Signing out must clear the HttpOnly cookie, not just reopen the picker: the
  // visitor list still loads, bootstrap is anonymous again and a reload stays
  // on the picker instead of restoring the previous account.
  const logoutPost = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/game/logout'));
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  assert.equal((await logoutPost).status(), 200, 'the server really cleared the cookie');
  await page.getByText('Choose a demo visitor').waitFor();
  await page.getByText(/Signed out of the demo account/).waitFor();
  assert.equal(await page.locator('.hud').count(), 0, 'the picker is shown after signing out');
  assert.equal(await page.evaluate(async () => (await fetch('/api/v1/game/bootstrap')).status), 401, 'the demo cookie was really cleared');
  await page.reload();
  await page.getByText('Choose a demo visitor').waitFor();
  assert.equal(await page.locator('.connection-gate select option').count(), 3);
  assert.equal(await page.locator('.hcard').count(), 0);
  const thirdId = await selectVisitor(2);
  assert.equal((await bootstrap()).player.id, thirdId);
  assert.equal((await bootstrap()).progress.player.onboarded, false, 'the third visitor starts fresh');
  console.log('  ✓ Sign-out clears the demo cookie and stays on the account picker');

  // Unreachable BFF presents an explicit error, never a silent local fallback.
  const offlineBootstrap = (route) => route.abort('failed');
  await page.route('**/api/v1/game/bootstrap', offlineBootstrap);
  await page.reload();
  await page.getByText('Could not connect to the game server').waitFor();
  assert.equal(await page.locator('.hud').count(), 0);
  await page.getByRole('button', { name: 'Use device-only game' }).click();
  await page.waitForSelector('.map');
  assert.equal(await page.locator('.hud__name').innerText(), 'Legacy');
  assert.equal(JSON.parse(await localSave()).xp, 987, 'device-only save stays separately playable');
  console.log('  ✓ History, cross-tab account changes, explicit offline fallback and preserved device-only game');

  const persianContext = await browser.newContext({ viewport: { width: 320, height: 700 }, locale: 'fa-IR', reducedMotion: 'reduce' });
  const persian = await persianContext.newPage();
  persian.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await persian.goto(base);
  await persian.getByText('یک ویزیتور نمایشی انتخاب کن').waitFor();
  await persian.locator('.connection-gate select').waitFor();
  await persian.getByRole('button', { name: 'ورود نمایشی' }).click();
  await persian.waitForSelector('.map');
  assert.equal(await persian.locator('html').getAttribute('dir'), 'rtl');
  const noOverflow = async () => {
    const size = await persian.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(size.content <= size.width, `server mode overflows mobile viewport: ${JSON.stringify(size)}`);
  };
  await noOverflow();
  await persian.goto(`${base}#/play/customer-visit-challenge`);
  await persian.waitForSelector('.play');
  await persian.getByRole('radio', { name: /مشتری جدید/ }).click();
  await persian.getByRole('button', { name: 'توقف مأموریت' }).click();
  await persian.getByRole('button', { name: /ذخیره و خروج/ }).click();
  await persian.waitForSelector('.map');
  const persianDraft = await persian.evaluate(async () => (await (await fetch('/api/v1/game/bootstrap')).json()).progress.drafts['customer-visit-challenge']);
  assert.equal(persianDraft.answers.customer_type, 'new', 'translated choices retain canonical answer IDs');
  await noOverflow();
  await persianContext.close();
  assert.deepEqual(pageErrors, []);
  console.log('  ✓ Persian RTL server sign-in, mobile layout and canonical answer IDs');
  console.log('BFF integration end-to-end checks passed.');
} finally {
  if (browser) await browser.close();
  for (const child of processes.reverse()) child.kill('SIGTERM');
  await Promise.all(processes.map((child) => new Promise((ok) => child.exitCode !== null || child.signalCode !== null || !child.pid ? ok() : child.once('exit', ok))));
  await rm(temp, { recursive: true, force: true });
}
