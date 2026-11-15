#!/usr/bin/env node
// Captures a website for the launch video: desktop + mobile screenshots,
// a tall full-page capture, the logo, and brand facts (copy, colors, fonts).
// Usage: node scripts/capture.mjs <url> [outDir=public/site]
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium, devices} from 'playwright';

const [url, outDir = 'public/site'] = process.argv.slice(2);
if (!url) {
  console.error('Usage: node scripts/capture.mjs <url> [outDir]');
  process.exit(1);
}
await fs.mkdir(outDir, {recursive: true});
const out = (f) => path.join(outDir, f);
const files = [];

const settle = async (page) => {
  try {
    await page.waitForLoadState('networkidle', {timeout: 15000});
  } catch {}
  await page.waitForTimeout(1200);
};

// Cookie/consent banners ruin screenshots; click the obvious accept button.
const dismissBanners = async (page) => {
  const label = /^(accept( all)?( cookies)?|agree|allow( all)?|got it|ok(ay)?|i understand)$/i;
  for (const b of await page.$$('button, [role=button]')) {
    try {
      const t = (await b.innerText()).trim();
      if (label.test(t) && (await b.isVisible())) {
        await b.click({timeout: 1000});
        await page.waitForTimeout(400);
      }
    } catch {}
  }
};

const open = async (context) => {
  const page = await context.newPage();
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
  await settle(page);
  await dismissBanners(page);
  // Scroll through once so lazy-loaded images and scroll animations fire.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, 9000); y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  return {page, height: await page.evaluate(() => document.documentElement.scrollHeight)};
};

const shot = async (page, name, opts = {}) => {
  await page.screenshot({path: out(name), ...opts});
  files.push(name);
};

const browser = await chromium.launch();
try {
  // Desktop
  const desk = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 2});
  const {page, height} = await open(desk);
  await shot(page, 'hero.png');
  for (let i = 1; i <= 4; i++) {
    const y = i * 900;
    if (y > height - 450) break;
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(600);
    await shot(page, `section-${i}.png`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await shot(page, 'full.png', {
    fullPage: true,
    clip: {x: 0, y: 0, width: 1440, height: Math.min(height, 7200)},
  });

  const info = await page.evaluate(() => {
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || undefined;
    const texts = (sel, n) =>
      [...document.querySelectorAll(sel)]
        .map((e) => e.innerText?.trim().replace(/\s+/g, ' '))
        .filter((t) => t && t.length < 200)
        .slice(0, n);
    const parse = (c) => {
      const m = c && c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return a < 0.5 ? null : [r, g, b];
    };
    const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const sat = ([r, g, b]) => {
      const mx = Math.max(r, g, b) / 255;
      const mn = Math.min(r, g, b) / 255;
      const l = (mx + mn) / 2;
      if (mx === mn) return 0;
      return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
    };
    const light = ([r, g, b]) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
    const accents = new Map();
    const backgrounds = new Map();
    const vw = window.innerWidth * window.innerHeight;
    for (const el of [...document.querySelectorAll('body *')].slice(0, 5000)) {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area < 16) continue;
      const cs = getComputedStyle(el);
      const bg = parse(cs.backgroundColor);
      if (bg && area > vw * 0.2) {
        const k = hex(bg);
        backgrounds.set(k, (backgrounds.get(k) || 0) + area);
      }
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      for (const [rgb, w] of [
        [bg, Math.min(area, 200000) / 1000],
        [hasText ? parse(cs.color) : null, 4],
      ]) {
        if (!rgb || sat(rgb) < 0.3 || light(rgb) > 0.9 || light(rgb) < 0.08) continue;
        const k = hex(rgb.map((v) => Math.min(255, Math.round(v / 6) * 6)));
        accents.set(k, (accents.get(k) || 0) + w);
      }
    }
    const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c);
    const bodyBg =
      parse(getComputedStyle(document.body).backgroundColor) ||
      parse(getComputedStyle(document.documentElement).backgroundColor);

    // Selectors in priority order; take the first visible match near the top
    // of the page (a comma-joined querySelector would return document order).
    const visibleTop = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 8 && r.height > 8 && r.top < 220 && r.width < window.innerWidth * 0.5;
    };
    const logoEl = [
      'header [class*="logo" i] svg',
      'header [class*="logo" i] img',
      'nav [class*="logo" i] svg',
      'nav [class*="logo" i] img',
      'header a[href="/"] svg',
      'header a[href="/"] img',
      'nav a[href="/"] svg',
      'nav a[href="/"] img',
      'a[href="/"] svg',
      'a[href="/"] img',
      'img[alt*="logo" i]',
      'img[src*="logo" i]',
      'header [class*="logo" i]',
      'header a[href="/"]',
      'nav a[href="/"]',
    ]
      .flatMap((sel) => [...document.querySelectorAll(sel)])
      .find(visibleTop) ??
      // Fallback: the top-left-most graphic in the header/nav is almost always the logo.
      [...document.querySelectorAll('header svg, header img, nav svg, nav img, a svg, a img')]
        .filter((el) => visibleTop(el) && el.getBoundingClientRect().left < window.innerWidth * 0.35)
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0];
    if (logoEl) logoEl.setAttribute('data-lr-logo', '1');

    // Standalone transparent logo: SVGs are serialized with their computed
    // fills inlined (class-based styles are lost outside the page); <img>
    // logos are downloaded from their src.
    let logoAsset;
    if (logoEl && logoEl.tagName.toLowerCase() === 'svg') {
      const r = logoEl.getBoundingClientRect();
      const clone = logoEl.cloneNode(true);
      const src = [logoEl, ...logoEl.querySelectorAll('*')];
      const dst = [clone, ...clone.querySelectorAll('*')];
      src.forEach((el, i) => {
        const cs = getComputedStyle(el);
        for (const prop of ['fill', 'stroke', 'opacity', 'fill-opacity', 'stroke-width']) {
          const v = cs.getPropertyValue(prop);
          if (v) dst[i].setAttribute(prop, v);
        }
      });
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(Math.round(r.width * 4)));
      clone.setAttribute('height', String(Math.round(r.height * 4)));
      if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      clone.style.color = getComputedStyle(logoEl).color;
      logoAsset = {kind: 'svg', markup: clone.outerHTML};
    } else if (logoEl && logoEl.tagName.toLowerCase() === 'img') {
      logoAsset = {kind: 'img', src: logoEl.currentSrc || logoEl.src};
    }
    const h1 = document.querySelector('h1');

    return {
      url: location.href,
      title: document.title,
      siteName: meta('meta[property="og:site_name"]'),
      description: meta('meta[name="description"]') || meta('meta[property="og:description"]'),
      ogImage: meta('meta[property="og:image"]'),
      themeColor: meta('meta[name="theme-color"]'),
      headings: {h1: texts('h1', 3), h2: texts('h2', 14), h3: texts('h3', 20)},
      paragraphs: texts('main p, section p, header p', 16),
      ctas: [
        ...new Set(
          texts('a, button', 400).filter(
            (t) => t.length < 32 && /get|start|try|sign|book|join|download|buy|demo|free|contact|waitlist/i.test(t),
          ),
        ),
      ].slice(0, 10),
      numbers: [
        ...new Set((document.body.innerText.match(/[$€£]?\d[\d,.]*\s?(%|x|×|\+|k|K|M|B)\b[^\n]{0,40}/g) || []).slice(0, 15)),
      ],
      colors: {
        background: top(backgrounds, 1)[0] ?? hex(bodyBg || [255, 255, 255]),
        pageBackgrounds: top(backgrounds, 4),
        text: hex(parse(getComputedStyle(h1 || document.body).color) || [0, 0, 0]),
        accents: top(accents, 6),
      },
      fonts: {
        heading: h1 ? getComputedStyle(h1).fontFamily : undefined,
        body: getComputedStyle(document.body).fontFamily,
      },
      icons: [...document.querySelectorAll('link[rel*="icon" i]')].map((l) => ({
        href: l.href,
        sizes: l.getAttribute('sizes'),
        rel: l.rel,
      })),
      hasLogo: !!logoEl,
      logoAsset,
    };
  });

  // Logo: real asset first (transparent), element screenshot as a fallback.
  const {logoAsset} = info;
  delete info.logoAsset;
  if (logoAsset?.kind === 'svg') {
    await fs.writeFile(out('logo.svg'), logoAsset.markup);
    files.push('logo.svg');
  } else if (logoAsset?.kind === 'img') {
    try {
      const res = await page.request.get(logoAsset.src);
      const type = res.headers()['content-type'] || '';
      if (res.ok() && /svg|png|webp/.test(type)) {
        const f = `logo.${type.includes('svg') ? 'svg' : type.includes('webp') ? 'webp' : 'png'}`;
        await fs.writeFile(out(f), await res.body());
        files.push(f);
      }
    } catch {}
  }
  const logo = await page.$('[data-lr-logo]');
  if (logo) {
    try {
      await logo.screenshot({path: out('logo-shot.png'), omitBackground: true});
      files.push('logo-shot.png');
    } catch {}
  }
  // Biggest icon (apple-touch-icon is usually a clean square mark).
  const icon =
    info.icons.find((i) => /apple-touch/i.test(i.rel)) ??
    info.icons.sort((a, b) => parseInt(b.sizes || '0') - parseInt(a.sizes || '0'))[0];
  for (const [src, name] of [
    [icon?.href, 'icon'],
    [info.ogImage, 'og'],
  ]) {
    if (!src) continue;
    try {
      const res = await page.request.get(new URL(src, info.url).href);
      if (!res.ok()) continue;
      const type = res.headers()['content-type'] || '';
      const ext = type.includes('svg') ? 'svg' : type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : type.includes('icon') ? 'ico' : 'png';
      const f = `${name}.${ext}`;
      await fs.writeFile(out(f), await res.body());
      files.push(f);
    } catch {}
  }

  // Mobile
  const {defaultBrowserType: _ignored, ...iphone} = devices['iPhone 13'];
  const mob = await browser.newContext(iphone);
  const m = await open(mob);
  await shot(m.page, 'mobile.png');
  await shot(m.page, 'mobile-full.png', {
    fullPage: true,
    clip: {x: 0, y: 0, width: 390, height: Math.min(m.height, 4200)},
  });

  const brand = {...info, files};
  await fs.writeFile(out('brand.json'), JSON.stringify(brand, null, 2));
  console.log(JSON.stringify(brand, null, 2));
  console.error(`\nSaved ${files.length} files + brand.json to ${outDir}`);
} finally {
  await browser.close();
}
