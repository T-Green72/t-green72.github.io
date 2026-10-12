// Browser checks for the T-Green site, run with Playwright (Chromium + WebKit).
// Start the local server first (npm run serve), then: npm run verify
// Telegram is blocked during tests and no e-mail is ever sent.
import { chromium, webkit } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.SITE_URL || 'http://127.0.0.1:4321/';
const TG = 'https://t.me/+Zo_IBpd2KXM1MzM6';
const EMAILS = ['tgreen0team@gmail.com', 'aostriagin@gmail.com'];
const OUT = '.impeccable/review';
await mkdir(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `\n        ${detail}` : detail ? `  (${detail})` : ''}`);
};
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

async function open(browser, viewport, opts = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: opts.dpr || 1,
    reducedMotion: opts.reducedMotion || 'no-preference',
    locale: 'ru-RU',
    isMobile: browser.browserType().name() === 'chromium' ? !!opts.isMobile : undefined,
    hasTouch: !!opts.hasTouch,
  });
  await context.route(/^https?:\/\/(www\.)?t\.me\//, (r) => r.abort()); // never contact Telegram
  if (opts.route) await context.route(opts.route.pattern, opts.route.handler);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 140));
    }
    const board = document.querySelector('.board');
    if (board.scrollWidth > board.clientWidth) {
      board.scrollIntoView({ block: 'center', behavior: 'instant' });
      for (let x = 0; x <= board.scrollWidth; x += 200) { board.scrollLeft = x; await new Promise((r) => setTimeout(r, 100)); }
      board.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
}

async function waitScrollEnd(page) {
  await page.evaluate(() => new Promise((resolve) => {
    let last = -1, same = 0;
    const tick = () => {
      if (window.scrollY === last) { if (++same > 6) return resolve(); } else { same = 0; last = window.scrollY; }
      requestAnimationFrame(tick);
    };
    tick();
  }));
}

/* ---------------- Layout at every size ---------------- */
async function layoutChecks(browser, label, vp) {
  const { context, page, errors } = await open(browser, vp.viewport, { ...vp, reducedMotion: 'reduce' });
  await scrollThrough(page);
  const layout = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const boardScrolls = getComputedStyle(document.querySelector('.board')).overflowX !== 'visible';
    const outside = [], clipped = [];
    for (const el of document.querySelectorAll('h1,h2,h3,p,a,button,li,dt,dd,figcaption,span,img,video')) {
      if (el.closest('dialog, .visually-hidden, .skip-link')) continue;
      if (boardScrolls && el.closest('.board')) continue; // horizontal photo strip on phones
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      if (r.right > vw + 1 || r.left < -1) outside.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 28)}" ${Math.round(r.left)}..${Math.round(r.right)}`);
      const cs = getComputedStyle(el);
      if (/(hidden|clip)/.test(cs.overflow + cs.overflowX) && el.scrollWidth > el.clientWidth + 1) clipped.push(el.textContent.trim().slice(0, 28));
      if (/^(H1|H2|H3|P|DT|DD|FIGCAPTION)$/.test(el.tagName) && el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.tagName} overflows: "${el.textContent.trim().slice(0, 28)}"`);
    }
    const broken = [];
    for (const el of document.querySelectorAll('h1, h2, h3, .sticky-num, .event-num, .tl-mark, .contact-value, .btn')) {
      const prev = el.style.overflowWrap;
      el.style.overflowWrap = 'normal';
      if (el.scrollWidth > el.clientWidth + 1) broken.push(el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30));
      el.style.overflowWrap = prev;
    }
    clipped.push(...broken.map((t) => `word too long for its line: "${t}"`));
    const h1 = document.querySelector('h1');
    const h1Lines = Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight));
    const cta = document.querySelector('.hero .btn-tg').getBoundingClientRect();
    const btnHeights = [...document.querySelectorAll('.btn')].map((b) => Math.round(b.getBoundingClientRect().height));
    return { overflowX: document.documentElement.scrollWidth - vw, outside: outside.slice(0, 8), clipped: clipped.slice(0, 8), h1Lines, ctaBottom: Math.round(cta.bottom), btnHeights };
  });
  check(`[${label}] no horizontal page scroll`, layout.overflowX <= 0, `${layout.overflowX}px extra`);
  check(`[${label}] nothing sticks out of the screen`, !layout.outside.length, layout.outside.join('; '));
  check(`[${label}] no clipped text`, !layout.clipped.length, layout.clipped.join('; '));
  check(`[${label}] Telegram button visible without scrolling`, layout.ctaBottom <= vp.viewport.height, `bottom ${layout.ctaBottom}px of ${vp.viewport.height}px`);
  check(`[${label}] buttons stay on one line`, layout.btnHeights.every((h) => h < 72), `heights ${layout.btnHeights.join(', ')}`);
  console.log(`        headline lines: ${layout.h1Lines}`);
  const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.closest('dialog') && !(i.complete && i.naturalWidth > 0)).map((i) => i.currentSrc || i.src));
  check(`[${label}] all images load`, !broken.length, broken.join(', '));
  await page.screenshot({ path: `${OUT}/${vp.file}-first.png` });
  await page.screenshot({ path: `${OUT}/${vp.file}.png`, fullPage: true });
  check(`[${label}] no browser errors`, !errors.length, errors.join(' | '));
  await context.close();
}

const sizes = [
  { file: 'mobile-320', viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, dpr: 2 },
  { file: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, dpr: 2 },
  { file: 'tablet', viewport: { width: 768, height: 1024 }, hasTouch: true },
  { file: 'laptop', viewport: { width: 1280, height: 800 } },
  { file: 'desktop', viewport: { width: 1440, height: 900 } },
];

const chrome = await chromium.launch();
const safari = await webkit.launch();

console.log('\n== Layout (Chromium)');
for (const vp of sizes) await layoutChecks(chrome, `${vp.viewport.width}px`, vp);
console.log('\n== Layout (WebKit / Safari engine)');
for (const vp of [sizes[1], sizes[4]]) await layoutChecks(safari, `WebKit ${vp.viewport.width}px`, { ...vp, file: `webkit-${vp.file}` });

/* ---------------- Content, links, language ---------------- */
console.log('\n== Content, links and language');
{
  const { context, page, errors } = await open(chrome, { width: 1280, height: 800 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  await scrollThrough(page);

  const meta = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    noTranslate: !!document.querySelector('[translate="no"], .notranslate, meta[name="google"][content="notranslate"]'),
    canvas: document.querySelectorAll('canvas').length,
    svgText: document.querySelectorAll('svg text').length,
    noSelect: [...document.querySelectorAll('*')].filter((e) => ['none'].includes(getComputedStyle(e).userSelect)).map((e) => e.tagName).slice(0, 5),
    title: document.title,
  }));
  check('document language is Russian (lang="ru")', meta.lang === 'ru');
  check('page is not marked untranslatable', !meta.noTranslate);
  check('no text drawn on canvas or as SVG text', !meta.canvas && !meta.svgText);
  check('text selection is not disabled anywhere', !meta.noSelect.length, meta.noSelect.join(', '));
  check('page title in Russian', meta.title === 'T-Green: летнее сообщество в Тюмени', meta.title);
  const ctxBlocked = await page.evaluate(() => {
    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.querySelector('.about-intro p').dispatchEvent(e);
    return e.defaultPrevented;
  });
  check('right-click menu is not blocked', !ctxBlocked);

  const text = norm(await page.evaluate(() => document.body.innerText));
  const essentials = ['T-Green', 'Лето, друзья и немного белок', 'школы № 72', 'около 2 200', 'Беличьи домики', 'Беличье воскресенье', 'Падел', 'Экопарке', '15-летию', '100+', 'Присоединиться в Telegram', 'Тюмень, с 2025 года', ...EMAILS];
  const missing = essentials.filter((s) => !text.includes(s));
  check('essential information is real, selectable HTML text', !missing.length, `missing: ${missing.join(', ')}`);
  check('no em dashes in visible text', !/[—–]/.test(text));

  const tg = await page.$$eval('a[href*="t.me"]', (as) => as.map((a) => a.getAttribute('href')));
  check('every Telegram link is exactly the invite URL', tg.length === 3 && tg.every((h) => h === TG), `${tg.length} links -> ${[...new Set(tg)].join(' ')}`);
  const tgLabels = await page.$$eval('a.btn-tg', (as) => as.map((a) => a.textContent.replace(/\s+/g, ' ').trim()));
  check('Telegram buttons share one natural Russian label', tgLabels.length === 2 && tgLabels.every((t) => t === 'Присоединиться в Telegram'), tgLabels.join(' | '));
  const mails = await page.$$eval('a[href^="mailto:"]', (as) => as.map((a) => [a.getAttribute('href'), a.textContent.trim()]));
  check('e-mail links use the confirmed addresses (not clicked)', mails.length === 2 && mails.every(([h, t]) => EMAILS.includes(t) && h === `mailto:${t}`), JSON.stringify(mails));

  const selected = await page.evaluate(() => {
    const p = document.querySelector('.about-intro p');
    const r = document.createRange(); r.selectNodeContents(p);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    return s.toString();
  });
  await page.keyboard.press('ControlOrMeta+KeyC');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check('text can be selected and copied with the keyboard', selected.length > 80 && norm(clip) === norm(selected), `copied: "${norm(clip).slice(0, 50)}…"`);

  const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))]);
  check('Cyrillic web fonts loaded (Rubik, Golos Text, Caveat)', ['Rubik', 'Golos Text', 'Caveat'].every((f) => fonts.includes(f)), fonts.join(', '));
  const families = await page.evaluate(() => ['h1', '.lead', '.hand'].map((s) => getComputedStyle(document.querySelector(s)).fontFamily.split(',')[0].replace(/"/g, '')));
  check('headings, text and notes use their own faces', families.join() === 'Rubik,Golos Text,Caveat', families.join(', '));

  // Copy buttons
  await page.getByRole('button', { name: 'Скопировать адрес tgreen0team@gmail.com' }).click();
  await page.waitForFunction(() => document.querySelector('.copy-status').textContent !== '', null, { timeout: 3000 }).catch(() => {});
  const copyStatus = await page.locator('.copy-status').first().textContent();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  check('copy button copies the team address and says so', copyStatus === 'Адрес скопирован' && copied === 'tgreen0team@gmail.com', `${copyStatus} / ${copied}`);

  // Menu
  for (const [name, id] of [['О нас', 'about'], ['Что делаем', 'activities'], ['Фото', 'photos'], ['Контакты', 'contacts']]) {
    await page.getByRole('navigation', { name: 'Основное меню' }).getByRole('link', { name, exact: true }).click();
    await waitScrollEnd(page);
    const pos = await page.evaluate((i) => ({ top: document.getElementById(i).getBoundingClientRect().top, atEnd: Math.ceil(window.scrollY + innerHeight) >= document.documentElement.scrollHeight - 1 }), id);
    check(`menu "${name}" scrolls to its section`, Math.abs(pos.top) <= 40 || (pos.atEnd && pos.top >= 0 && pos.top < 200), `section top at ${Math.round(pos.top)}px${pos.atEnd ? ', page end' : ''}`);
  }
  await page.locator('.to-top').click();
  await waitScrollEnd(page);
  check('"Наверх" returns to the top', (await page.evaluate(() => window.scrollY)) < 5);
  check('no browser errors during content checks', !errors.length, errors.join(' | '));
  await context.close();
}

/* ---------------- Gallery ---------------- */
console.log('\n== Gallery');
for (const [label, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844 }]]) {
  const { context, page, errors } = await open(chrome, vp, { hasTouch: label === 'phone', isMobile: label === 'phone', dpr: label === 'phone' ? 2 : 1 });
  const first = page.locator('.photo-open').first();
  await first.scrollIntoViewIfNeeded();
  await first.click();
  await page.locator('dialog.lightbox').waitFor({ state: 'visible' });
  const state = () => page.evaluate(async () => {
    const img = document.querySelector('.lb-img');
    if (img.src) await img.decode().catch(() => {});
    return {
      open: document.querySelector('dialog').open,
      status: document.querySelector('.lb-status').textContent,
      caption: document.querySelector('.lb-caption').textContent,
      loaded: img.complete && img.naturalWidth > 0,
      alt: img.alt,
      focusInside: document.querySelector('dialog').contains(document.activeElement),
    };
  });
  let s = await state();
  check(`[${label}] photo opens with caption, description and counter`, s.open && s.loaded && s.status === 'Фото 1 из 4' && s.caption.length > 5 && s.alt.length > 20 && s.focusInside, JSON.stringify(s));
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/gallery-${label}.png` });
  await page.keyboard.press('ArrowRight');
  check(`[${label}] arrow key shows the next photo`, (await state()).status === 'Фото 2 из 4');
  await page.getByRole('button', { name: 'Следующее фото' }).click();
  check(`[${label}] "Следующее фото" button works`, (await state()).status === 'Фото 3 из 4');
  await page.getByRole('button', { name: 'Предыдущее фото' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  check(`[${label}] "Предыдущее фото" and wrap-around work`, (await state()).status === 'Фото 4 из 4');
  let leaked = 0;
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    leaked += await page.evaluate(() => (document.activeElement !== document.body && !document.querySelector('dialog').contains(document.activeElement) ? 1 : 0));
  }
  check(`[${label}] page behind the open viewer never receives focus`, leaked === 0, `${leaked} leaks`);
  await page.getByRole('button', { name: 'Закрыть' }).focus();
  await page.keyboard.press('Escape');
  const afterEsc = await page.evaluate(() => ({ open: document.querySelector('dialog').open, focusBack: document.activeElement === document.querySelector('.photo-open') }));
  check(`[${label}] Escape closes and returns focus to the photo`, !afterEsc.open && afterEsc.focusBack, JSON.stringify(afterEsc));
  await first.click();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  check(`[${label}] "Закрыть" closes the viewer`, !(await page.evaluate(() => document.querySelector('dialog').open)));
  await first.click();
  await page.mouse.click(4, 4);
  check(`[${label}] clicking the dark backdrop closes the viewer`, !(await page.evaluate(() => document.querySelector('dialog').open)));
  if (label === 'phone') {
    const strip = await page.evaluate(() => { const b = document.querySelector('.board'); return { scrolls: b.scrollWidth > b.clientWidth, snap: getComputedStyle(b).scrollSnapType }; });
    check('[phone] photos form a swipeable strip', strip.scrolls && strip.snap.includes('x'), JSON.stringify(strip));
  }
  check(`[${label}] no browser errors in gallery`, !errors.length, errors.join(' | '));
  await context.close();
}
{
  // Error state: a photo that fails to load shows a message instead of a broken image
  const { context, page } = await open(chrome, { width: 1280, height: 800 }, {
    route: { pattern: /steklotekh-stage-1200\.webp$/, handler: (r) => r.fulfill({ status: 404, body: '' }) },
  });
  await page.locator('.photo-open').nth(3).scrollIntoViewIfNeeded();
  await page.locator('.photo-open').nth(3).click({ modifiers: [] });
  await page.waitForTimeout(400);
  const err = await page.evaluate(() => ({ msg: document.querySelector('.lb-error').hidden ? '' : document.querySelector('.lb-error').textContent, imgHidden: document.querySelector('.lb-img').hidden }));
  check('a photo that fails to load shows "Не получилось загрузить фото."', err.msg === 'Не получилось загрузить фото.' && err.imgHidden, JSON.stringify(err));
  await context.close();
}

/* ---------------- Keyboard ---------------- */
console.log('\n== Keyboard');
{
  const { context, page } = await open(chrome, { width: 1280, height: 800 });
  await page.keyboard.press('Tab');
  const skip = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), visible: document.activeElement.getBoundingClientRect().top >= 0 }));
  check('first Tab shows the "Перейти к содержанию" link', skip.text === 'Перейти к содержанию' && skip.visible, JSON.stringify(skip));
  await page.keyboard.press('Enter');
  check('skip link jumps to the content', (await page.evaluate(() => location.hash)) === '#main');
  const order = [];
  let missingRing = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      return { name: (el.getAttribute('aria-label') || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 32), tag: el.tagName, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, cls: el.className };
    });
    order.push(f.name || f.tag);
    if (!f.ring && f.tag !== 'VIDEO') missingRing.push(f.name);
    if (String(f.cls).includes('photo-open')) {
      await page.keyboard.press('Enter');
      const opened = await page.evaluate(() => document.querySelector('dialog').open);
      check('Enter on a focused photo opens the viewer', opened);
      await page.keyboard.press('Escape');
      break;
    }
  }
  check('every focused control shows a visible focus ring', !missingRing.length, missingRing.join(', '));
  console.log(`        focus order: ${order.join(' → ')}`);
  await context.close();
}

/* ---------------- Video (WebKit: H.264 like Safari) ---------------- */
console.log('\n== Video (WebKit)');
{
  const { context, page, errors } = await open(safari, { width: 1280, height: 800 });
  const hoop = page.locator('video.autoplay-when-visible');
  await hoop.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  const h = await hoop.evaluate((v) => ({ paused: v.paused, muted: v.muted, controls: v.controls, loop: v.loop, t: v.currentTime, poster: !!v.poster }));
  check('5-second clip plays silently, with controls, while on screen', !h.paused && h.muted && h.controls && h.loop && h.t > 0, JSON.stringify(h));
  await hoop.evaluate((v) => v.pause());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollBy({ top: -900, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await hoop.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  check('clip stays paused after the visitor pauses it', await hoop.evaluate((v) => v.paused));

  const sq = page.locator('.houses video');
  const sqAttrs = await sq.evaluate((v) => ({ autoplay: v.autoplay, controls: v.controls, preload: v.preload, mutedAttr: v.hasAttribute('muted'), paused: v.paused }));
  check('squirrel video: controls, no autoplay, sound on, loads only when played', !sqAttrs.autoplay && sqAttrs.controls && sqAttrs.preload === 'none' && !sqAttrs.mutedAttr && sqAttrs.paused, JSON.stringify(sqAttrs));
  await hoop.evaluate((v) => v.play());
  await sq.scrollIntoViewIfNeeded();
  await sq.evaluate((v) => { v.muted = true; return v.play(); }); // muted only because a headless test cannot click with sound
  await page.waitForTimeout(2500);
  const playing = await page.evaluate(() => ({ sq: document.querySelector('.houses video').currentTime, sqDuration: document.querySelector('.houses video').duration, hoopPaused: document.querySelector('video.autoplay-when-visible').paused }));
  check('squirrel video plays (H.264/AAC MP4)', playing.sq > 0.5 && playing.sqDuration > 60, JSON.stringify(playing));
  check('only one video plays at a time', playing.hoopPaused);
  await sq.evaluate((v) => v.pause());
  await page.screenshot({ path: `${OUT}/webkit-video.png` });
  check('no browser errors in video checks', !errors.length, errors.join(' | '));
  await context.close();
}

/* ---------------- Reduced motion ---------------- */
console.log('\n== Motion preferences');
{
  const { context, page } = await open(chrome, { width: 1280, height: 800 }, { reducedMotion: 'reduce' });
  const r = await page.evaluate(() => ({ jsMotion: document.documentElement.classList.contains('js-motion'), anim: getComputedStyle(document.querySelector('.hero h1')).animationName, smooth: getComputedStyle(document.documentElement).scrollBehavior }));
  check('reduced motion: no entrance animation or smooth scrolling', !r.jsMotion && r.anim === 'none' && r.smooth === 'auto', JSON.stringify(r));
  await page.locator('video.autoplay-when-visible').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  check('reduced motion: the silent clip does not start by itself', await page.locator('video.autoplay-when-visible').evaluate((v) => v.paused));
  const circle = await page.locator('.hand-circle path').evaluate((p) => getComputedStyle(p).strokeDashoffset);
  check('reduced motion: Sunday circle is simply shown', parseFloat(circle) === 0, circle);
  await context.close();
}
{
  const { context, page } = await open(chrome, { width: 1280, height: 800 });
  const m = await page.evaluate(() => ({ jsMotion: document.documentElement.classList.contains('js-motion'), anim: getComputedStyle(document.querySelector('.hero h1')).animationName }));
  await page.locator('.week').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  const drawn = await page.evaluate(() => ({ cls: document.querySelector('.week').classList.contains('is-drawn'), off: parseFloat(getComputedStyle(document.querySelector('.hand-circle path')).strokeDashoffset) }));
  check('normal motion: hero rises in, Sunday gets circled by hand', m.jsMotion && m.anim === 'rise' && drawn.cls && drawn.off < 0.01, JSON.stringify({ ...m, ...drawn }));
  await page.locator('.houses').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/squirrel-section.png` });
  await context.close();
}

/* ---------------- Accessibility scan ---------------- */
console.log('\n== Accessibility (axe-core)');
for (const [label, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844 }]]) {
  const { context, page } = await open(chrome, vp, { reducedMotion: 'reduce' });
  await scrollThrough(page);
  await page.addScriptTag({ content: axeSource });
  const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((x) => `${x.id} (${x.impact}, ${x.nodes.length}): ${x.nodes[0]?.target}`));
  check(`[${label}] axe-core finds no accessibility violations`, !v.length, v.join(' | '));
  await context.close();
}

await chrome.close();
await safari.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
