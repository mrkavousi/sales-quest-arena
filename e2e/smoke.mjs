/**
 * End-to-end smoke test: plays the Customer Visit Challenge in a real browser
 * and checks rewards, level-up, statuses, history and persistence across reloads.
 *
 *   npm start                       # terminal 1 (serves http://localhost:4173)
 *   npx playwright install chromium # once
 *   node e2e/smoke.mjs              # terminal 2
 *   Set SQA_CHROMIUM_PATH to use an already-installed Chromium executable.
 */
import { chromium } from 'playwright';
const URL = process.env.SQA_URL ?? 'http://localhost:4173/';
const errors = [];
const log = (...a) => console.log(...a);
const browser = await chromium.launch({ executablePath: process.env.SQA_CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
const shot = async () => {}; // screenshots disabled in the smoke test
const assert = (cond, msg) => { if (!cond) { errors.push(`ASSERT FAILED: ${msg}`); log('  ✗', msg); } else log('  ✓', msg); };

await page.goto(URL);
await page.waitForSelector('.welcome__card');
await page.waitForTimeout(700);
await shot('01-welcome');
await page.click('button[aria-label="Panda"]');
await page.fill('.input', 'Alex');
await page.click('text=Enter the arena');
await page.waitForSelector('.hud');
await page.waitForTimeout(1200);
await shot('02-arena', true);
assert((await page.textContent('.hud__name')) === 'Alex', 'player name shown');
assert(await page.locator('.node--available').count() === 1, 'one available mission');
assert(await page.locator('.node--locked').count() === 5, 'five locked missions');

// locked mission detail
await page.locator('.node--locked .node__btn').first().click();
await page.waitForSelector('.detail');
await page.waitForTimeout(500);
await shot('03-locked-detail');
assert(await page.locator('.detail__locked').count() === 1, 'locked mission shows requirement, no start button');
await page.click('.sheet__close');

// open customer visit
await page.locator('.node--available .node__btn').click();
await page.waitForSelector('.detail');
await page.waitForTimeout(500);
await shot('04-intro');
await page.click('.detail__cta');
await page.waitForSelector('.play');
await page.waitForTimeout(700);
await shot('05-step1');
assert(await page.locator('.play__foot .btn--block').isDisabled(), 'continue disabled until answered');
await page.click('text=New Customer');
await page.waitForTimeout(400);
await shot('06-step1-selected');

// leave mid-mission -> in progress
await page.click('button[aria-label="Pause mission"]');
await page.waitForTimeout(400);
await shot('07-pause');
await page.click('text=Save & exit');
await page.waitForSelector('.map');
await page.waitForTimeout(900);
assert(await page.locator('.node--in_progress').count() === 1, 'mission is In Progress after leaving');
await page.evaluate(() => window.scrollTo(0, 260));
await shot('08-arena-inprogress');
await page.reload();
await page.waitForSelector('.map');
assert(await page.locator('.node--in_progress').count() === 1, 'In Progress survives reload');
await page.locator('.node--in_progress .node__btn').click();
await page.waitForSelector('.detail');
assert((await page.textContent('.detail__cta')).includes('Continue'), 'CTA says Continue');
await page.click('.detail__cta');
await page.waitForSelector('.play');
assert(await page.locator('.option.is-selected').count() === 1, 'previous answer restored');
await page.click('.play__foot .btn--block');
await page.waitForTimeout(500);
await page.click('text=Order Received');
await page.waitForTimeout(400);
await shot('09-step2');
await page.click('.play__foot .btn--block');
await page.waitForTimeout(500);
await page.locator('.rating__star').nth(4).click();
await page.waitForTimeout(700);
await shot('10-step3');
await page.click('.play__foot .btn--block');
await page.waitForTimeout(500);
await page.fill('.note__input', 'Wants 20 units by Friday');
await page.waitForTimeout(300);
await shot('11-step4');
await page.click('.play__foot .btn--block');
await page.waitForSelector('.result');
await page.waitForTimeout(900);
await shot('12-result-early');
await page.waitForSelector('.levelup', { timeout: 6000 });
await page.waitForTimeout(900);
await shot('13-levelup');
await page.click('text=Awesome!');
await page.waitForTimeout(1500);
await shot('14-result-final', true);
assert((await page.textContent('.rewardcard--xp b')).trim() === '+180', 'XP earned = 100 + 50 daily + 30 order');
assert((await page.textContent('.rewardcard--coin b')).trim() === '+20', 'coins earned = 20');
assert((await page.textContent('.result__level-name')).includes('Explorer'), 'level updated to Explorer');
// refresh on result page keeps working
await page.reload();
await page.waitForSelector('.result');
await page.waitForTimeout(600);
await page.click('text=Collect & continue', { timeout: 8000 });
await page.waitForSelector('.map');
await page.waitForTimeout(2600);
await shot('15-arena-after', true);
assert(await page.locator('.node--completed').count() === 1, 'mission status = Completed');
assert(await page.locator('.node--available').count() === 1, 'next mission unlocked');
assert((await page.textContent('.hud__xp-num b')).trim() === '180', 'HUD XP = 180');
assert((await page.textContent('.hud__title')).includes('Explorer'), 'HUD level = Explorer');

await page.reload();
await page.waitForSelector('.map');
await page.waitForTimeout(800);
assert(await page.locator('.node--completed').count() === 1, 'Completed survives reload');
assert((await page.textContent('.hud__xp-num b')).trim() === '180', 'XP survives reload');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sales-quest-arena:progress:v1')));
assert(saved.xp === 180 && saved.coins === 20 && saved.history.length === 1, 'localStorage holds xp/coins/history');

await page.click('a[href="#/history"]');
await page.waitForSelector('.hcard');
await page.waitForTimeout(600);
await shot('16-history', true);
assert((await page.textContent('.hcard')).includes('Customer Visit Challenge'), 'history shows completed mission');
assert((await page.textContent('.hcard__note')).includes('Wants 20 units by Friday'), 'history shows note');
await page.click('a[href="#/missions"]');
await page.waitForSelector('.mcard');
await page.waitForTimeout(700);
await shot('17-missions', true);
await page.click('a[href="#/profile"]');
await page.waitForSelector('.profile__hero');
await page.waitForTimeout(700);
await shot('18-profile', true);

// replay: no second daily bonus
await page.goto(URL + '#/play/customer-visit-challenge');
await page.waitForSelector('.play');
await page.click('text=Existing Customer'); await page.click('.play__foot .btn--block'); await page.waitForTimeout(450);
await page.click('text=Successful Meeting'); await page.click('.play__foot .btn--block'); await page.waitForTimeout(450);
await page.locator('.rating__star').nth(2).click(); await page.click('.play__foot .btn--block'); await page.waitForTimeout(450);
assert((await page.textContent('.play__foot .btn--block')).includes('Complete'), 'note step is optional (can complete empty)');
await page.click('.play__foot .btn--block');
await page.waitForSelector('.result');
await page.waitForTimeout(3200);
assert((await page.textContent('.rewardcard--xp b')).trim() === '+100', 'replay gives 100 XP, no second daily bonus');
assert(await page.locator('.levelup').count() === 0, 'no level-up when level unchanged');
await shot('19-result-replay', true);

// locked mission cannot be opened by URL
await page.goto(URL + '#/play/sales-summit');
await page.waitForSelector('.map');
assert(true, 'locked mission URL redirects to arena');

await page.goto(URL + '#/');
await page.waitForTimeout(500);
log('\nConsole problems:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
if (errors.length) process.exit(1);
