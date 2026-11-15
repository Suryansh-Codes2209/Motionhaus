//
//   WORLD.add({
//   });
(() => {
const W = 1920, H = 1080, { clamp, lerp, ss } = U;
const WD = window.WORLD = { segs: [], GROUND: 760, V: +(new URLSearchParams(location.search).get('v') || 560), HERO_H: 300 };
WD.add = seg => { WD.segs.push(seg); };
WD.START_X = 320;

WD.layout = () => {
  const q = new URLSearchParams(location.search), only = q.get('only');
  let segs = (window.FILM_ORDER || WD.segs.map(s => s.id)).map(id => WD.segs.find(s => s.id === id)).filter(Boolean);
  if (only) { const set = only.split(','); segs = segs.filter(s => set.includes(s.id)); }
  let x = 0, t = 0; const plan = [];
  for (const s of segs) {
    s.x0 = x; s.x1 = x + s.w;
    const acts = (s.acts || []).slice().sort((a, b) => a.at - b.at); let lx = plan.length ? 0 : Math.min(WD.START_X, (acts[0] ? acts[0].at : s.w) - 60);
    s.tIn = t;
    for (const a of acts) { t += (a.at - lx) / (a.v || s.v || WD.V); plan.push({ seg: s, kind: 'walk', t0: t - (a.at - lx) / (a.v || s.v || WD.V), t1: t, x0: x + lx, x1: x + a.at });
      plan.push({ seg: s, kind: 'act', act: a, t0: t, t1: t + a.dur, x0: x + a.at, x1: x + a.at + (a.dx || 0) }); t += a.dur; lx = a.at + (a.dx || 0); }
    const tw = (s.w - lx) / (s.v || WD.V); plan.push({ seg: s, kind: 'walk', t0: t, t1: t + tw, x0: x + lx, x1: x + s.w }); t += tw;
    s.tOut = t; x += s.w;
  }
  WD.plan = plan; WD.total = t + (window.FILM_TAIL || 0); WD.active = segs; return WD;
};
WD.heroAt = t => {
  const p = WD.plan.find(q => t >= q.t0 && t < q.t1) || WD.plan[WD.plan.length - 1];
  const u = clamp((t - p.t0) / Math.max(1e-6, p.t1 - p.t0));
  const x = lerp(p.x0, p.x1, p.kind === 'walk' ? u : (p.act.move ? p.act.move(u) : u));
  return { x, p, u: t - p.t0 };
};
const segAt = x => WD.active.find(s => x >= s.x0 && x < s.x1) || WD.active[WD.active.length - 1];
WD.seamX = (s, y) => s.x0 + 22 * Math.sin(y * 0.011 + s.x0 * 0.001) + 8 * Math.sin(y * 0.047 + s.x0 * 0.003);
const band = (c, a, b, camX) => { c.beginPath();
  for (let y = -10; y <= H + 10; y += 20) c.lineTo(a ? WD.seamX(a, y) - camX : -60, y);
  for (let y = H + 10; y >= -10; y -= 20) c.lineTo(b ? WD.seamX(b, y) - camX : W + 60, y);
  c.closePath(); c.clip(); };

WD.draw = (c, t) => {
  if (!WD.plan) WD.layout();
  const hero = WD.heroAt(t), hs = segAt(hero.x);
  const camX = WD.camAt(t);
  const vis = WD.active.filter(s => s.x1 > camX - 80 && s.x0 < camX + W + 80);
  const ctxFor = s => ({ camX: camX - s.x0, t, lt: t - s.tIn, hx: hero.x - s.x0, act: hero.p.seg === s && hero.p.kind === 'act' ? { a: hero.p.act, u: hero.u } : null, W, H, G: WD.GROUND });
  for (const s of vis) { const k = WD.active.indexOf(s), nx = WD.active[k + 1]; c.save(); band(c, k ? s : null, nx, camX); s.back(c, ctxFor(s)); c.restore(); }
  for (const s of vis) {
    if (hero.x < s.x0 - 200 || hero.x > s.x1 + 200) continue;
    const k = WD.active.indexOf(s), nx = WD.active[k + 1], S = ctxFor(s);
    c.save(); band(c, k ? s : null, nx, camX);
    WD.drawHero(c, s, S, hero);
    c.restore();
  }
  for (const s of vis) { if (!s.front) continue; const k = WD.active.indexOf(s), nx = WD.active[k + 1]; c.save(); band(c, k ? s : null, nx, camX); s.front(c, ctxFor(s)); c.restore(); }
  for (const s of vis) { const k = WD.active.indexOf(s); if (!k) continue; c.save(); for (let y = -10; y < H + 10; y += 6) { const sx = WD.seamX(s, y) - camX; if (sx < -120 || sx > W + 120) break; if (s.seam) s.seam(c, y, sx, t); else { c.fillStyle = '#f4ead2'; c.fillRect(sx - 6, y, 8 + U.hash(y, 3) * 6, 7); } } c.restore(); }
  for (const s of WD.active) { const k = WD.active.indexOf(s); if (!k) continue; const tc = WD.crossT(s); const a = (t - tc) / 0.5; if (a > 0 && a < 1 && XING.burst) XING.burst(c, s.x0 - camX, WD.GROUND - WD.HERO_H * 0.5, a, 160, s.burst || 'monet', k + 3); }
  if (window.FILM_LABEL !== false) WD.label(c, hs, t);
};
WD.camAt = t => {
  if (!WD._cam) {
    const R = 120, n = Math.ceil(WD.total * R) + 2, raw = new Float64Array(n), last = WD.active[WD.active.length - 1];
    let mx = -1e9;
    for (let k = 0; k < n; k++) { const tt = k / R, h = WD.heroAt(tt);
      const lead = h.p.kind === 'act' ? (h.p.act.lead ?? 160) * ss(0, 0.6, h.u) : 0;
      mx = Math.max(mx, h.x - 720 + lead); raw[k] = mx; }
    const sig = 0.14 * R, K = Math.ceil(sig * 3), ker = []; let ks = 0; for (let j = -K; j <= K; j++) { const w = Math.exp(-j * j / (2 * sig * sig)); ker.push(w); ks += w; }
    const sm = new Float64Array(n);
    for (let k = 0; k < n; k++) { let a = 0; for (let j = -K; j <= K; j++) a += ker[j + K] * raw[clamp(k + j, 0, n - 1)]; sm[k] = clamp(a / ks, 0, Math.max(0, last.x1 - W)); }
    WD._cam = { R, sm };
  }
  const { R, sm } = WD._cam, f = clamp(t * R, 0, sm.length - 1), k = Math.floor(f), u = f - k;
  return sm[k] + (sm[Math.min(k + 1, sm.length - 1)] - sm[k]) * u;
};
WD.crossT = s => { const p = WD.plan.find(q => q.seg === s); return p ? p.t0 : 0; };
WD.actT = (s, k = 0) => { const ps = WD.plan.filter(q => q.seg === s && q.kind === 'act'); return ps[k] ? ps[k].t0 : s.tIn; };
WD.itemT = g => g.item.atAct != null ? WD.actT(g, g.item.act || 0) + g.item.atAct : g.tIn + (g.item.gotAt ?? (g.tOut - g.tIn) * 0.7);

WD.drawHero = (c, s, S, hero) => {
  const H0 = s.hero || {}, h = H0.h || WD.HERO_H, lx = hero.x - s.x0;
  const gy = (hero.p.kind === 'act' && hero.p.act.y) ? hero.p.act.y(lx, hero.u) : (s.ground ? s.ground(lx) : WD.GROUND);
  let key = H0.walk, i;
  const walked = WD.plan.filter(q => q.kind === 'walk' && q.t0 <= S.t).reduce((a, q) => a + Math.min(S.t, q.t1) - q.t0, 0);
  if (hero.p.kind === 'act' && hero.p.seg === s) { key = hero.p.act.key || H0.walk; i = hero.p.act.frame ? hero.p.act.frame(hero.u) : 0; }
  else { const n = XING.nFrames(key); i = Math.floor(walked * (H0.fps || 8.5) * WD.V / 330) % n; }
  const o = { x: hero.x - S.camX - s.x0 + s.x0 - s.x0, y: gy, h, mat: H0.mat || 'none', t: S.t, wx: hero.x, shadow: H0.shadow ?? 'rgba(0,0,0,.14)', flip: H0.flip };
  o.x = lx - S.camX;
  if (H0.draw) H0.draw(c, key, i, o, S); else XING.actor(c, key, i, o);
  if (window.FILM_HAT_ITEMS !== true) return;
  if (s.hideHatItems && s.hideHatItems(S)) return;
  const [tx, ty] = XING.hatTop(key, i, o); WD.drawHatStack(c, tx, ty + 4, h, S.t);
};
WD.drawHatStack = (c, tx, y, h, t, rot = 0) => {
  c.save(); c.translate(tx, y); c.rotate(rot); y = 0; tx = 0; const S = { t };
  for (const g of WD.active) { if (!g.item) continue; const tg = WD.itemT(g); if (S.t < tg) continue;
    const pop = ss(tg, tg + 0.25, S.t), sc = (g.item.s || 1) * (0.6 + 0.4 * pop) * h / 300;
    const wob = Math.sin(S.t * 6 + g.x0) * 2 * ss(tg, tg + 0.3, S.t);
    c.save(); c.translate(tx + wob, y); g.item.draw(c, 0, 0, sc, S.t); c.restore();
    y -= (g.item.hgt || 26) * sc; }
  c.restore(); return y;
};

WD.label = (c, s, t) => {
  const a = ss(s.tIn, s.tIn + 0.35, t); if (!s.year) return;
  const yr = typeof s.year === 'number' ? (s.year < 0 ? `${-s.year} BC` : String(s.year)) : s.year;
  c.save(); c.globalAlpha = a; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
  c.font = '600 54px "Poppins-700", sans-serif'; const w1 = c.measureText(yr).width;
  c.font = '30px "LXGWWenKai-500", sans-serif'; const w2 = c.measureText(s.name || '').width;
  const bw = Math.max(w1, w2) + 48;
  c.fillStyle = 'rgba(250,246,236,.78)'; c.beginPath(); c.roundRect(1890 - bw, 50, bw, 118, 14); c.fill();
  c.fillStyle = 'rgba(30,30,40,.88)'; c.font = '600 54px "Poppins-700", sans-serif'; c.fillText(yr, 1866, 108);
  c.font = '30px "LXGWWenKai-500", sans-serif'; c.fillText(s.name || '', 1866, 152); c.restore();
};
})();
