(() => {
  window.__bootErrors = window.__bootErrors || [];
  const base = 'demos/long_scroll/';
  const load = url => { const x = new XMLHttpRequest(); x.open('GET', url, false); x.send(); if (x.status !== 200) { __bootErrors.push(`${url} not found (HTTP ${x.status})`); return; }
    try { (0, eval)(x.responseText + `\n//# sourceURL=${url}`); } catch (e) { __bootErrors.push(`${url} threw ${e && e.stack || e}`); } };
  load(base + 'lib/crossing.js');
  load(base + 'lib/acts.js');
  load(base + 'lib/world.js');
  window.FILM_ORDER = ['02_egypt', '28_monet', '14_8bit'];
  for (const id of window.FILM_ORDER) { const n = WORLD.segs.length; load(`${base}segments/${id}.js`);
    if (WORLD.segs.length === n || WORLD.segs[WORLD.segs.length - 1].id !== id) __bootErrors.push(`segments/${id}.js has no WORLD.add({ id: '${id}', ... })`); }
  const sprites = new Set(); WORLD.segs.forEach(s => { if (s.hero && s.hero.walk) sprites.add(s.hero.walk); (s.acts || []).forEach(a => a.key && sprites.add(a.key)); (s.sprites || []).forEach(k => sprites.add(k)); });
  try { window.EXTRA_ASSETS = (window.EXTRA_ASSETS || []).concat(XING.sprites([...sprites])); } catch (e) { __bootErrors.push('frame library missing: ' + e.message); }
  WORLD.layout();
  window.PUNCH = 0;
  window.ERAS = [{ id: 'film', dur: WORLD.total, draw: (c, lt, t) => WORLD.draw(c, t) }];
})();
