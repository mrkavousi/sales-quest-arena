/**
 * Persian end-to-end coverage. Start the app with npm run dev first, then run:
 *   npx playwright install chromium
 *   SQA_URL=http://localhost:5173/ node e2e/persian.mjs
 * Set SQA_CHROMIUM_PATH to use an already-installed Chromium executable.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.SQA_URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.SQA_CHROMIUM_PATH || undefined });
const errors = [];
const observe = (page) => {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
};
const language = async (page) => page.evaluate(() => ({
  lang: document.documentElement.lang,
  dir: document.documentElement.dir,
  title: document.title,
  saved: localStorage.getItem('sales-quest-arena:language:v1'),
}));
const progress = async (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sales-quest-arena:progress:v1')));
const noHorizontalOverflow = async (page) => {
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(sizes.scroll <= sizes.width, `page overflows horizontally: ${JSON.stringify(sizes)}`);
};

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  observe(page);
  await page.goto(url);
  await page.waitForSelector('.welcome__card');
  assert.equal((await language(page)).lang, 'en');
  await page.getByRole('button', { name: 'فارسی', exact: true }).click();
  assert.deepEqual(await language(page), { lang: 'fa', dir: 'rtl', title: 'ماجراجویی فروش | آرنا', saved: 'fa' });
  assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /ماجراجویی فروش/);
  assert.equal(await page.locator('.input').getAttribute('dir'), 'rtl');
  await page.reload();
  assert.equal((await language(page)).lang, 'fa');
  assert.equal(await page.locator('.welcome__bubble').innerText(), 'سلام، من پیپ هستم! روز فروش خودت را به یک ماجراجویی تبدیل کن. آماده‌ای؟');
  await noHorizontalOverflow(page);

  await page.getByRole('radio', { name: 'پاندا' }).click();
  await page.locator('.input').fill('علی');
  await page.getByRole('button', { name: 'ورود به میدان' }).click();
  await page.waitForSelector('.hud');
  assert.equal(await page.locator('.hud__name').innerText(), 'علی');
  assert.match(await page.locator('.hud__title').innerText(), /سطح ۱/);
  assert.match(await page.locator('.daily__title').innerText(), /چالش بازدید از مشتری/);
  await page.locator('.node--locked .node__btn').first().click();
  assert.match(await page.locator('.detail__locked').innerText(), /چالش بازدید از مشتری/);
  await page.locator('.sheet__close').click();

  await page.locator('.node--available .node__btn').click();
  await page.locator('.detail__cta').click();
  await page.waitForSelector('.play');
  assert.equal(await page.locator('.ask__question').innerText(), 'به دیدار چه کسی رفتی؟');
  assert.equal(await page.locator('.play__foot .btn--block').isDisabled(), true);
  // Persian keyboard digits select the same stable option ID as an English keyboard.
  await page.locator('body').dispatchEvent('keydown', { key: '۲', bubbles: true });
  assert.equal(await page.locator('.option.is-selected .option__label').innerText(), 'مشتری جدید');
  await page.getByRole('button', { name: 'توقف مأموریت' }).click();
  await page.locator('.sheet').getByRole('button', { name: 'English', exact: true }).click();
  assert.equal((await language(page)).dir, 'ltr');
  assert.equal(await page.locator('.ask__question').innerText(), 'Who did you visit?');
  assert.equal(await page.locator('.option.is-selected .option__label').innerText(), 'New Customer');
  assert.equal((await progress(page)).drafts['customer-visit-challenge'].answers.customer_type, 'new');
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await page.locator('.play__foot .btn--block').click();
  await page.getByRole('radio', { name: /Order Received/ }).click();
  await page.getByRole('button', { name: 'Pause mission' }).click();
  await page.locator('.sheet').getByRole('button', { name: 'فارسی', exact: true }).click();
  assert.equal(await page.locator('.option.is-selected .option__label').innerText(), 'سفارش دریافت شد');
  await page.getByRole('button', { name: 'ادامهٔ بازی' }).click();
  await page.locator('.play__foot .btn--block').click();
  assert.match(await page.locator('.rating__star').nth(4).getAttribute('aria-label'), /۵ ستاره/);
  await page.locator('.rating__star').nth(4).click();
  await page.locator('.play__foot .btn--block').click();
  assert.equal(await page.locator('.note__input').getAttribute('dir'), 'rtl');
  const note = 'نیاز به پیش‌فاکتور ۲۰ عدد';
  await page.locator('.note__input').fill(note);
  await page.locator('.play__foot .btn--block').click();
  await page.waitForSelector('.result');
  assert.equal(await page.locator('.result__title').innerText(), 'مأموریت تکمیل شد!');
  await page.waitForSelector('.levelup', { timeout: 6000 });
  assert.match(await page.locator('.levelup').innerText(), /کاوشگر/);
  await page.getByRole('button', { name: 'عالیه!' }).click();
  await page.waitForTimeout(1000);
  assert.equal((await page.locator('.rewardcard--xp b').innerText()).trim(), '+۱۸۰');
  assert.equal((await page.locator('.rewardcard--coin b').innerText()).trim(), '+۲۰');
  assert.match(await page.locator('.result__lines').innerText(), /پاداش دریافت سفارش/);
  assert.match(await page.locator('.result__achievements').innerText(), /قدم‌های اول/);
  await noHorizontalOverflow(page);
  const completed = await progress(page);
  assert.equal(completed.xp, 180);
  assert.equal(completed.coins, 20);
  assert.equal(completed.history[0].answers.note, note);
  assert.equal(completed.history[0].answers.outcome, 'order_received');

  // A refreshed result and a previously saved English reward label still render in Persian.
  await page.reload();
  await page.waitForSelector('.result');
  assert.equal((await language(page)).lang, 'fa');
  assert.match(await page.locator('.result__lines').innerText(), /تکمیل مأموریت/);
  await page.getByRole('button', { name: 'دریافت پاداش و ادامه' }).click();
  await page.waitForSelector('.map');
  await page.locator('a[href="#/history"]').click();
  await page.waitForSelector('.hcard');
  assert.match(await page.locator('.hcard').innerText(), /چالش بازدید از مشتری/);
  assert.match(await page.locator('.hcard').innerText(), /مشتری جدید/);
  assert.match(await page.locator('.hcard').innerText(), /سفارش دریافت شد/);
  assert.match(await page.locator('.hcard__note').innerText(), /پیش‌فاکتور/);
  assert.equal(await page.locator('.hgroup__label').innerText(), 'امروز');

  await page.locator('.nav__language').click();
  assert.equal((await language(page)).lang, 'en');
  assert.match(await page.locator('.hcard').innerText(), /Customer Visit Challenge/);
  assert.match(await page.locator('.hcard').innerText(), /New Customer/);
  assert.match(await page.locator('.hcard__note').innerText(), /پیش‌فاکتور/);
  assert.deepEqual(await progress(page), completed);
  await page.reload();
  assert.equal((await language(page)).lang, 'en');
  await page.locator('.nav__language').click();
  assert.equal((await language(page)).lang, 'fa');

  // RTL layout remains usable on both desktop and narrow mobile screens.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.shell__main')).paddingRight === '282px');
  const nav = await page.locator('.nav').boundingBox();
  const content = await page.locator('.page').boundingBox();
  assert.ok(nav && content && nav.x >= 1000 && content.x + content.width <= nav.x, `desktop navigation is on the right of the content: ${JSON.stringify({ nav, content })}`);
  await noHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.locator('a[href="#/missions"]').click();
  await page.waitForSelector('.mcard');
  assert.match(await page.locator('.pagehead h1').innerText(), /مأموریت‌ها/);
  await noHorizontalOverflow(page);

  // A language change in another tab updates the UI without touching game progress.
  const second = await ctx.newPage();
  observe(second);
  await second.goto(url);
  await second.waitForSelector('.map');
  assert.equal((await language(second)).lang, 'fa');
  await second.locator('.nav__language').click();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.deepEqual(await progress(page), completed);
  await page.locator('.nav__language').click();
  await second.waitForFunction(() => document.documentElement.lang === 'fa');
  await second.close();

  // Every other built-in mission remains playable with its own translated content.
  const remaining = [
    ['product-spotlight', 'چه چیزی را معرفی کردی؟', 'محصول در کانون توجه'],
    ['follow-up-sprint', 'چطور پیگیری کردی؟', 'مسابقهٔ پیگیری'],
    ['new-customer-hunt', 'چطور او را پیدا کردی؟', 'شکار مشتری جدید'],
    ['market-scout', 'چه چیزی را بررسی کردی؟', 'کاوشگر بازار'],
    ['sales-summit', 'به چه چیزی رسیدی؟', 'قلهٔ فروش'],
  ];
  for (const [id, question, title] of remaining) {
    const missionUrl = new URL(url);
    missionUrl.hash = `/play/${id}`;
    await page.goto(missionUrl.href);
    await page.waitForSelector('.play');
    assert.equal(await page.locator('.ask__question').innerText(), question);
    await page.locator('.option').first().click();
    await page.locator('.play__foot .btn--block').click();
    await page.locator('.option').first().click();
    await page.locator('.play__foot .btn--block').click();
    await page.locator('.rating__star').nth(2).click();
    await page.locator('.play__foot .btn--block').click();
    await page.locator('.play__foot .btn--block').click(); // optional note
    await page.waitForSelector('.result');
    assert.equal(await page.locator('.result__mission').innerText(), title);
    await page.getByRole('button', { name: 'دریافت پاداش و ادامه' }).click();
    await page.waitForSelector('.map');
  }
  assert.equal((await progress(page)).history.length, 6);
  assert.equal(await page.locator('.node--completed').count(), 6);

  await page.locator('a[href="#/profile"]').click();
  await page.getByRole('button', { name: 'بازنشانی همهٔ پیشرفت' }).click();
  await page.getByRole('button', { name: 'بله، بازنشانی کن' }).click();
  await page.waitForSelector('.welcome__card');
  assert.equal((await language(page)).saved, 'fa');
  assert.equal((await language(page)).dir, 'rtl');
  await ctx.close();

  // Load a version-1 save from before localization, including an English note,
  // a saved reward breakdown and a partially completed mission.
  const legacy = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce' });
  const legacyPage = await legacy.newPage();
  observe(legacyPage);
  await legacyPage.goto(url);
  const now = new Date().toISOString();
  const legacySave = {
    version: 1,
    player: { name: 'Alex', avatar: 'panda', onboarded: true, createdAt: now },
    xp: 180, coins: 20,
    streak: { count: 1, best: 1, lastActiveDate: null },
    missions: { 'customer-visit-challenge': { completions: 1, firstCompletedAt: now, lastCompletedAt: now, bestRating: 5 } },
    drafts: { 'product-spotlight': { missionId: 'product-spotlight', stepIndex: 1, answers: { showcase: 'bundle' }, startedAt: now } },
    daily: null,
    achievements: { first_steps: now },
    history: [{
      id: 'legacy-run', missionId: 'customer-visit-challenge', completedAt: now,
      answers: { customer_type: 'new', outcome: 'order_received', rating: 5, note: 'English customer note' },
      flags: ['order_received', 'five_star', 'note_added'], wasDaily: true,
      rewards: { lines: [
        { ruleId: 'mission_complete', label: 'Mission complete', xp: 100, coins: 20 },
        { ruleId: 'daily_bonus', label: 'Daily challenge bonus', xp: 50, coins: 0 },
        { ruleId: 'order_bonus', label: 'Order received bonus', xp: 30, coins: 0 },
      ], xp: 180, coins: 20 },
      xpBefore: 0, xpAfter: 180, coinsAfter: 20, levelBefore: 1, levelAfter: 2, streakAfter: 1, achievementsUnlocked: ['first_steps'],
    }],
  };
  await legacyPage.evaluate((save) => {
    localStorage.setItem('sales-quest-arena:progress:v1', JSON.stringify(save));
    localStorage.setItem('sales-quest-arena:language:v1', 'en');
  }, legacySave);
  const legacyHistory = new URL(url);
  legacyHistory.hash = '/history';
  await legacyPage.goto(legacyHistory.href);
  await legacyPage.reload();
  await legacyPage.waitForSelector('.hcard');
  await legacyPage.locator('.nav__language').click();
  assert.match(await legacyPage.locator('.hcard').innerText(), /مشتری جدید/);
  assert.match(await legacyPage.locator('.hcard__note').innerText(), /English customer note/);
  assert.equal((await progress(legacyPage)).xp, 180);
  const legacyResult = new URL(url);
  legacyResult.hash = '/result/legacy-run';
  await legacyPage.goto(legacyResult.href);
  await legacyPage.waitForSelector('.result');
  assert.match(await legacyPage.locator('.result__lines').innerText(), /پاداش دریافت سفارش/);
  const legacyDraft = new URL(url);
  legacyDraft.hash = '/play/product-spotlight';
  await legacyPage.goto(legacyDraft.href);
  await legacyPage.waitForSelector('.play');
  assert.equal(await legacyPage.locator('.ask__question').innerText(), 'واکنش مشتری چه بود؟');
  await legacyPage.getByRole('button', { name: 'چالش قبلی' }).click();
  assert.equal(await legacyPage.locator('.option.is-selected .option__label').innerText(), 'بستهٔ محصولات');
  await legacy.close();

  const faBrowser = await browser.newContext({ locale: 'fa-IR' });
  const faPage = await faBrowser.newPage();
  observe(faPage);
  await faPage.goto(url);
  await faPage.waitForSelector('.welcome__card');
  assert.equal((await language(faPage)).lang, 'fa');
  assert.equal((await language(faPage)).dir, 'rtl');
  assert.equal((await language(faPage)).saved, null);
  await faBrowser.close();

  // Storage failures must not prevent switching languages or playing this session.
  const blocked = await browser.newContext({ locale: 'en-US' });
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  const blockedPage = await blocked.newPage();
  observe(blockedPage);
  await blockedPage.goto(url);
  await blockedPage.waitForSelector('.storage-banner');
  await blockedPage.getByRole('button', { name: 'فارسی', exact: true }).click();
  assert.equal(await blockedPage.locator('html').getAttribute('dir'), 'rtl');
  assert.match(await blockedPage.locator('.storage-banner').innerText(), /ذخیره نمی‌شود/);
  await blockedPage.getByRole('button', { name: 'ورود به میدان' }).click();
  await blockedPage.waitForSelector('.map');
  await blocked.close();

  assert.deepEqual(errors, []);
  console.log('Persian localization end-to-end checks passed.');
} finally {
  await browser.close();
}
