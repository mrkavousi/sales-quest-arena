/**
 * Cross-repository browser test: admin mission -> game -> visitor submission -> operator review -> rewards.
 * Runs the real FastAPI BFF (fresh temp SQLite DB) and the Vite dev server with the same /api/v1/game proxy
 * that Vercel uses in production. No external service, production database or real identity is used.
 *
 *   SQA_BACKEND_DIR=/path/to/comu-center \
 *   SQA_BACKEND_PYTHON=/path/to/venv/bin/python \
 *   SQA_CHROMIUM_PATH=/path/to/chromium (optional) npm run test:bff
 *
 * Needs the backend branch arena/demo-sprint with migration 0007 (API v2 DB missions).
 */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const backend = process.env.SQA_BACKEND_DIR;
if (!backend) throw new Error('Set SQA_BACKEND_DIR to a checkout of iciiex/comu-center (branch arena/demo-sprint).');
const pythonPath = process.env.SQA_BACKEND_PYTHON ?? 'python3';
const python = /[\\/]/.test(pythonPath) ? resolve(pythonPath) : pythonPath;
const temp = await mkdtemp(join(tmpdir(), 'sqa-bff-e2e-'));
const dbPath = join(temp, 'demo.sqlite');
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
  for (let i = 0; i < 200; i += 1) {
    if (child.exitCode !== null || !child.pid) throw new Error(`Process failed: ${logs.join('').slice(-3000)}`);
    try { const response = await fetch(url); if (response.ok) return; } catch { /* starting */ }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}: ${logs.join('').slice(-3000)}`);
};
/** Read-only SQL against the temp DB, to assert the two ledgers directly. */
const sql = (query, ...params) => JSON.parse(execFileSync(python, ['-c',
  'import sqlite3,sys,json\nc=sqlite3.connect(sys.argv[1])\nc.row_factory=sqlite3.Row\nprint(json.dumps([dict(r) for r in c.execute(sys.argv[2], sys.argv[3:])]))',
  dbPath, query, ...params], { encoding: 'utf8' }));

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const TITLE = 'معرفی محصول جدید';
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
let browser;
let failed = false;
try {
  const backendPort = await freePort();
  let frontendPort = await freePort();
  while (frontendPort === backendPort) frontendPort = await freePort();
  const apiBase = `http://127.0.0.1:${backendPort}`;
  const api = start(python, ['-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', String(backendPort)], {
    cwd: resolve(backend),
    env: { ...process.env, KILOOS_ENV: 'test', KILOOS_DB: dbPath, KILOOS_EVIDENCE_DIR: join(temp, 'evidence'), KILOOS_SECRET: 'test-secret-that-is-long-enough-1234567890' },
  });
  await waitForHttp(`${apiBase}/health`, api);
  const web = start(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], {
    cwd: process.cwd(), env: { ...process.env, VITE_GAME_MODE: 'server', GAME_BFF_TARGET: apiBase },
  });
  const base = `http://127.0.0.1:${frontendPort}/`;
  await waitForHttp(base, web);

  // ---- staff HTTP client (admin panel and operator queue are server-rendered HTML forms)
  const staffCookie = async (mobile) => {
    const [{ id }] = sql('SELECT id FROM users WHERE mobile = ?', mobile);
    const response = await fetch(`${apiBase}/demo-login`, { method: 'POST', body: new URLSearchParams({ user_id: id }), redirect: 'manual' });
    assert.equal(response.status, 303, 'staff demo login redirects');
    return response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
  };
  const csrfOf = async (cookie, pagePath = '/admin/missions/new') => {
    const html = await (await fetch(`${apiBase}${pagePath}`, { headers: { cookie } })).text();
    const match = /name="csrf" value="([^"]+)"/.exec(html);
    assert.ok(match, 'csrf token on the admin form');
    return match[1];
  };
  const form = async (cookie, path, fields, csrfPage) => fetch(`${apiBase}${path}`, {
    method: 'POST', redirect: 'manual', headers: { cookie }, body: new URLSearchParams({ csrf: await csrfOf(cookie, csrfPage), ...fields }),
  });
  const decide = (id, fields) => form(operator, `/admin/submissions/${id}/review`, fields, `/admin/submissions/${id}`);
  const admin = await staffCookie('09120000005');
  const operator = await staffCookie('09120000004');
  const mission = (over) => ({
    title: TITLE, description: 'معرفی محصول جدید به مشتریان فروشگاه.', instructions: 'محصول را معرفی کنید و واکنش مشتری را بنویسید.',
    category: 'product_intro', difficulty: 'easy', estimated_minutes: '10', points: '20', game_xp: '100', game_coins: '20',
    max_per_user: '1', starts_on: day(-1), ends_on: day(10), requires_evidence: '1', requires_review: '1', ...over,
  });
  const create = async (over, publish = true) => {
    const created = await form(admin, '/admin/missions/new', mission(over));
    assert.equal(created.status, 303, `create ${over.title ?? TITLE}: ${created.status}`);
    const [{ id }] = sql('SELECT id FROM missions WHERE title = ?', over.title ?? TITLE);
    if (publish) assert.equal((await form(admin, `/admin/missions/${id}/publish`, {})).status, 303);
    return id;
  };

  // 1-3. Admin creates «معرفی محصول جدید» (20 org points, 100 XP, 20 coins) and publishes it.
  const draftId = await create({ title: 'مأموریت پیش‌نویس' }, false);
  const expiredId = await create({ title: 'کمپین تمام‌شده', starts_on: day(-20), ends_on: day(-2) });
  const missionId = await create({});
  const lostId = await create({ title: 'مأموریت قطع شبکه', requires_evidence: '0', game_xp: '10', game_coins: '5' });
  const row = sql('SELECT points, game_xp, game_coins, status FROM missions WHERE id = ?', missionId)[0];
  assert.deepEqual(row, { points: 20, game_xp: 100, game_coins: 20, status: 'active' });

  // ---- visitor browser (Persian UI, phone viewport)
  browser = await chromium.launch({ executablePath: process.env.SQA_CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR', reducedMotion: 'reduce' });
  const page = await context.newPage();
  globalThis.__page = page;
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem('sqa-e2e-seeded')) {
      localStorage.setItem('sales-quest-arena:mode:v1', 'server');
      localStorage.setItem('sales-quest-arena:language:v1', 'fa');
      localStorage.setItem('sqa-e2e-seeded', 'yes');
    }
  });
  const bootstrap = () => page.evaluate(async () => {
    const response = await fetch('/api/v1/game/bootstrap', { headers: { 'X-Game-Api': '2' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`bootstrap: ${response.status}`);
    return response.json();
  });
  const view = async (id) => (await bootstrap()).missions.find((item) => item.id === id);
  const cardOf = (title) => page.locator('.mcard').filter({ has: page.locator('.mcard__title', { hasText: new RegExp(`^${title}$`) }) });
  const submissionRows = (id) => sql('SELECT id, status, request_id FROM submissions WHERE mission_id = ?', id);

  await page.goto(base);
  await page.locator('.connection-gate select').waitFor();
  const anonymous = await page.evaluate(async () => {
    const response = await fetch('/api/v1/game/bootstrap');
    return { status: response.status, data: await response.json() };
  });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.data.error.code, 'AUTHENTICATION_REQUIRED');
  const options = page.locator('.connection-gate select option');
  assert.equal(await options.count(), 3, 'only visitor accounts are offered');
  const visitorId = (await options.evaluateAll((nodes) => nodes.map((node) => node.value)))[0];
  await page.locator('.connection-gate select').selectOption(visitorId);
  await page.locator('.connection-gate .btn--yellow').click();
  await page.waitForFunction(() => !document.querySelector('.connection-gate'));
  assert.equal(new URL(page.url()).search, '', 'cookie session: no token in the URL');
  const cookie = (await context.cookies()).find((item) => item.name === 'kiloos_session');
  assert.ok(cookie?.httpOnly && cookie.sameSite === 'Lax');

  // finish onboarding through the real profile endpoint, then reload into the arena
  await page.evaluate(async () => {
    const boot = await (await fetch('/api/v1/game/bootstrap')).json();
    const response = await fetch('/api/v1/game/profile', { method: 'PATCH', headers: { 'X-CSRF-Token': boot.csrf_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'سارا', avatar: 'fox' }) });
    if (!response.ok) throw new Error(`profile: ${response.status}`);
  });
  await page.goto(`${base}#/missions`);
  await page.reload();
  await page.locator('.mcards').waitFor();

  // 4. The visitor sees the exact admin mission; drafts are hidden; the expired one is marked and blocked.
  const state = await bootstrap();
  assert.equal(state.api_version, '2');
  assert.equal(state.progress.daily, null, 'no daily challenge in server DB mode');
  assert.ok(!state.missions.some((item) => item.id === draftId), 'draft missions are not visible');
  assert.ok(!state.missions.some((item) => ['customer-visit-challenge', 'product-spotlight'].includes(item.id)), 'catalog missions are no longer the player list');
  const card = cardOf(TITLE);
  await card.waitFor();
  assert.equal(await cardOf('مأموریت پیش‌نویس').count(), 0);
  assert.match(await card.innerText(), /امتیاز سازمانی/);
  assert.match(await card.innerText(), /۱۰۰/);
  assert.match(await card.innerText(), /۲۰/);
  assert.equal(await card.locator('.pill').innerText(), 'در دسترس');
  const expiredCard = cardOf('کمپین تمام‌شده');
  assert.equal(await expiredCard.locator('.pill').innerText(), 'منقضی شده');
  await expiredCard.click();
  await page.locator('.detail').waitFor();
  assert.equal(await page.locator('.detail__cta').count(), 0, 'an expired mission cannot be started');
  assert.match(await page.locator('.detail__locked').innerText(), /مهلت/);
  await page.keyboard.press('Escape');
  if (await page.locator('.detail').count()) await page.locator('.sheet__backdrop').click({ position: { x: 5, y: 5 } });

  // 5. Open it, see instructions + separated rewards, fill the form (text + required image) and submit.
  const submitRequests = [];
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().includes('/submissions')) submitRequests.push(request); });
  await card.click();
  const detail = page.locator('.detail');
  await detail.waitFor();
  assert.match(await detail.innerText(), /محصول را معرفی کنید/);
  assert.match(await detail.innerText(), /امتیاز سازمانی/);
  await detail.locator('.detail__cta').click();
  await page.locator('.note__input').waitFor();
  await page.locator('.note__input').fill('معرفی انجام شد؛ مشتری استقبال کرد.');
  await delay(600); // let the draft autosave (350 ms debounce)
  assert.equal((await view(missionId)).status, 'in_progress');
  await page.reload();                       // the run resumes from the server draft after a reload
  await page.locator('.note__input').waitFor();
  assert.equal(await page.locator('.note__input').inputValue(), 'معرفی انجام شد؛ مشتری استقبال کرد.');
  const next = page.locator('.play__foot .btn--block');
  await next.click();                         // -> evidence step (required)
  await page.locator('.evidence__input').waitFor();
  assert.equal(await next.isDisabled(), true, 'required image blocks submission');
  await page.locator('.evidence__input').setInputFiles({ name: 'shot.png', mimeType: 'image/png', buffer: PNG });
  await page.locator('.evidence__preview').waitFor();
  await next.click();

  // 6-7. Pending review: clear status, nothing rewarded anywhere.
  await page.locator('.connection-gate__body h1').waitFor();
  assert.equal(await page.locator('.connection-gate__body h1').innerText(), 'برای بررسی ارسال شد');
  assert.equal(submitRequests.length, 1);
  const subs = submissionRows(missionId);
  assert.equal(subs.length, 1);
  assert.equal(subs[0].status, 'submitted');
  const key = submitRequests[0].headers()['idempotency-key'];
  assert.equal(subs[0].request_id, key);
  assert.ok(submitRequests[0].headers()['x-csrf-token']);
  assert.equal(sql('SELECT COUNT(*) AS n FROM score_events WHERE source_id = ?', subs[0].id)[0].n, 0);
  assert.equal(sql('SELECT COUNT(*) AS n FROM game_reward_events WHERE source_id = ?', subs[0].id)[0].n, 0);
  let pending = await bootstrap();
  assert.equal(pending.progress.xp, 0);
  assert.equal(pending.progress.coins, 0);
  assert.equal((await view(missionId)).status, 'pending_review');
  await page.locator('.connection-gate__body .btn--green').click();
  await page.locator('.mcards').waitFor();
  assert.equal(await cardOf(TITLE).locator('.pill').innerText(), 'در انتظار بررسی');

  // The submission is in the existing operator queue.
  const queue = await (await fetch(`${apiBase}/admin/submissions?status=submitted`, { headers: { cookie: operator } })).text();
  assert.ok(queue.includes(TITLE), 'submission appears in the operator review queue');
  const review = await (await fetch(`${apiBase}/admin/submissions/${subs[0].id}`, { headers: { cookie: operator } })).text();
  assert.ok(review.includes('ثبت‌شده از بازی') && review.includes('معرفی انجام شد'), 'operator sees the game source and the text answer');

  const walletOf = () => Number(sql('SELECT balance FROM point_wallets WHERE user_id = ?', visitorId)[0]?.balance ?? 0);
  const walletBefore = walletOf(); // the seeded visitor already has sample points
  // 8-9. Operator approves; the game shows «تأیید شد».
  assert.equal((await decide(subs[0].id, { decision: 'approve' })).status, 303);
  await page.reload();
  await page.locator('.mcards').waitFor();
  assert.equal(await cardOf(TITLE).locator('.pill').innerText(), 'تأیید شد');

  // 10-11. Exactly 20 org points in the Kiloos ledger, exactly 100 XP / 20 coins in the game ledger.
  assert.equal(sql('SELECT SUM(points) AS p, COUNT(*) AS n FROM score_events WHERE source_id = ?', subs[0].id)[0].p, 20);
  const game = sql('SELECT xp, coins FROM game_reward_events WHERE source_id = ?', subs[0].id);
  assert.deepEqual(game, [{ xp: 100, coins: 20 }]);
  const approved = await bootstrap();
  assert.equal(approved.progress.xp, 100);
  assert.equal(approved.progress.coins, 20);
  assert.equal(walletOf() - walletBefore, 20, 'the wallet grew by the 20 org points only; XP/coins never touch it');

  // 12. Repeated approval and request retries award nothing again.
  assert.equal((await decide(subs[0].id, { decision: 'approve' })).status, 409);
  const replay = await page.evaluate(async ({ id, idemKey, answer, bytes }) => {
    const boot = await (await fetch('/api/v1/game/bootstrap')).json();
    const body = new FormData();
    body.set('answer', answer);
    body.set('evidence', new File([new Uint8Array(bytes)], 'shot.png', { type: 'image/png' }), 'shot.png');
    const response = await fetch(`/api/v1/game/missions/${id}/submissions`, { method: 'POST', headers: { 'X-CSRF-Token': boot.csrf_token, 'Idempotency-Key': idemKey, 'X-Game-Api': '2' }, body });
    return { status: response.status, replay: response.headers.get('Idempotent-Replay') };
  }, { id: missionId, idemKey: key, answer: 'معرفی انجام شد؛ مشتری استقبال کرد.', bytes: [...PNG] });
  assert.deepEqual(replay, { status: 200, replay: 'true' });
  assert.equal(submissionRows(missionId).length, 1);
  assert.equal(sql('SELECT COUNT(*) AS n FROM game_reward_events')[0].n, 1);
  assert.equal(sql('SELECT SUM(points) AS p FROM score_events WHERE source_id = ?', subs[0].id)[0].p, 20);
  assert.equal((await bootstrap()).progress.xp, 100);
  assert.equal(await cardOf(TITLE).locator('.pill').innerText(), 'تأیید شد');
  // completion limit (1) is enforced by the server, so the UI refuses a second start
  assert.equal((await view(missionId)).canStart, false);

  // Lost response: the server stores the submission but the browser sees a network error; the retry
  // reuses the same Idempotency-Key and must not create a second submission.
  await cardOf('مأموریت قطع شبکه').click();
  await page.locator('.detail__cta').click();
  await page.locator('.note__input').fill('پاسخ آزمایشی برای قطع شبکه');
  let dropped = false;
  await page.route('**/api/v1/game/missions/*/submissions', async (route) => {
    if (!dropped) { dropped = true; await route.fetch(); await route.abort('failed'); } else await route.continue();
  });
  const retryNext = page.locator('.play__foot .btn--block');
  await retryNext.click();                    // -> the optional image step
  await retryNext.click();                    // submit; the response is dropped by the route handler
  for (let i = 0; i < 100 && !dropped; i += 1) await delay(100);
  assert.ok(dropped, 'the first submission request was intercepted');
  await delay(800);                         // the client now reports a failure while the server already stored it
  assert.equal(submissionRows(lostId).length, 1, 'the dropped request was processed once by the server');
  await retryNext.click();                    // retry with the same key
  await page.locator('.connection-gate__body h1').waitFor();
  assert.equal(submissionRows(lostId).length, 1, 'the retry did not create a second submission');
  const retryKeys = submitRequests.filter((request) => request.url().includes(lostId)).map((request) => request.headers()['idempotency-key']);
  assert.equal(new Set(retryKeys).size, 1, 'both attempts used the same Idempotency-Key');
  assert.equal(retryKeys.length, 2);

  // Rejection grants nothing: operator rejects the second submission.
  const [lost] = submissionRows(lostId);
  assert.equal((await decide(lost.id, { decision: 'reject', reason: 'پاسخ ناکافی' })).status, 303);
  assert.equal(sql('SELECT COUNT(*) AS n FROM game_reward_events WHERE source_id = ?', lost.id)[0].n, 0);
  assert.equal(sql('SELECT COUNT(*) AS n FROM score_events WHERE source_id = ?', lost.id)[0].n, 0);
  const rejected = await view(lostId);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.latestSubmission.rejectionReason, 'پاسخ ناکافی');
  assert.equal((await bootstrap()).progress.xp, 100, 'a rejected submission adds no XP');

  // Permissions stay intact: an operator session cannot use the visitor-only game API.
  const operatorGame = await fetch(`${apiBase}/api/v1/game/bootstrap`, { headers: { cookie: operator, 'X-Game-Api': '2' } });
  assert.equal(operatorGame.status, 403);
  assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
  console.log('Cross-repository mission scenario passed (create → publish → game → submit → review → rewards).');
} catch (error) {
  failed = true;
  console.error(error);
  try { console.error('PAGE', globalThis.__page?.url(), await globalThis.__page?.evaluate(() => document.body.innerText.slice(0, 600))); } catch { /* page gone */ }
  console.error(logs.join('').slice(-3000));
  process.exitCode = 1;
} finally {
  await browser?.close();
  for (const child of processes) child.kill();
  await delay(300);
  await rm(temp, { recursive: true, force: true }).catch(() => {});
  if (failed) process.exitCode = 1;
}
