import assert from 'node:assert/strict';
import {test} from 'node:test';
import {attributionLine, filterByLicense, isCommercialSafe, licenseFields, normalizeLicense} from '../src/licenses.mjs';

/** @param {string | null | undefined} raw @param {string} [v] */
const lic = (raw, v) => normalizeLicense(raw, v).license;

test('normalizes Creative Commons URLs', () => {
  assert.equal(lic('https://creativecommons.org/publicdomain/zero/1.0/'), 'CC0');
  assert.equal(lic('http://creativecommons.org/publicdomain/mark/1.0/'), 'PD');
  assert.equal(lic('https://creativecommons.org/licenses/by/4.0/'), 'CC-BY');
  assert.equal(lic('http://creativecommons.org/licenses/by-sa/3.0/'), 'CC-BY-SA');
  assert.equal(lic('http://creativecommons.org/licenses/by-nc-sa/3.0/'), 'CC-BY-NC');
  assert.equal(lic('http://creativecommons.org/licenses/by-nc-nd/2.5/in/'), 'CC-BY-NC');
  assert.equal(lic('https://creativecommons.org/licenses/by-nd/4.0/'), 'CC-BY-ND');
  assert.equal(normalizeLicense('http://creativecommons.org/licenses/by/3.0/').version, '3.0');
});

test('normalizes Openverse codes', () => {
  assert.equal(lic('cc0'), 'CC0');
  assert.equal(lic('pdm'), 'PD');
  assert.equal(lic('by'), 'CC-BY');
  assert.equal(lic('by-sa'), 'CC-BY-SA');
  assert.equal(lic('by-nc'), 'CC-BY-NC');
  assert.equal(lic('by-nc-sa'), 'CC-BY-NC');
  assert.equal(lic('by-nd'), 'CC-BY-ND');
  assert.equal(lic('sampling+'), 'unknown');
  assert.equal(lic('nc-sampling+'), 'unknown');
  assert.equal(normalizeLicense('by', '4.0').url, 'https://creativecommons.org/licenses/by/4.0/');
});

test('normalizes Freesound names and free text', () => {
  assert.equal(lic('Creative Commons 0'), 'CC0');
  assert.equal(lic('Attribution'), 'CC-BY');
  assert.equal(lic('Attribution NonCommercial'), 'CC-BY-NC');
  assert.equal(lic('Attribution Noncommercial ShareAlike 3.0'), 'CC-BY-NC');
  assert.equal(lic('CC BY-SA 4.0'), 'CC-BY-SA');
  assert.equal(lic('CC-BY'), 'CC-BY');
  assert.equal(lic('CC0'), 'CC0');
  assert.equal(lic('PD'), 'PD');
  assert.equal(lic('Public Domain'), 'PD');
});

test('fails closed on ambiguous or missing licenses', () => {
  for (const raw of [null, undefined, '', '   ', 'Creative Commons', 'All rights reserved', 'Licensed by Sony Music',
    'https://example.com/terms', 'royalty free', 'CC BY-SA-ND']) {
    assert.equal(lic(raw), 'unknown', String(raw));
  }
});

test('commercial filter keeps only CC0, PD, CC-BY, CC-BY-SA', () => {
  const meta = {title: 't', creator: 'c', sourceUrl: null};
  const mk = (/** @type {string | null} */ raw, /** @type {string} */ id) => ({
    id, provider: 'x', ...meta, durationSec: 1, previewUrl: null, downloadUrl: null, ...licenseFields(meta, raw),
  });
  const all = [
    mk('cc0', 'a'), mk('pdm', 'b'), mk('by', 'c'), mk('by-sa', 'd'),
    mk('by-nc', 'e'), mk('by-nd', 'f'), mk(null, 'g'), mk('sampling+', 'h'),
  ];
  const kept = filterByLicense(all, {commercialUseOnly: true}).map((r) => r.id);
  assert.deepEqual(kept, ['a', 'b', 'c', 'd']);
  // A result that claims commercial use but carries an unknown license is still excluded.
  assert.equal(isCommercialSafe({...all[6], allowsCommercialUse: true}), false);
  // Without the flag nothing is dropped, and the licenses option narrows.
  assert.equal(filterByLicense(all, {}).length, 8);
  assert.deepEqual(filterByLicense(all, {licenses: ['CC0', 'CC-BY-NC']}).map((r) => r.id), ['a', 'e']);
});

test('attribution flags and lines', () => {
  const meta = {title: 'Whoosh', creator: 'Kinoton', sourceUrl: 'https://freesound.org/s/1/'};
  const by = licenseFields(meta, 'by', '4.0');
  assert.equal(by.requiresAttribution, true);
  assert.equal(by.allowsCommercialUse, true);
  assert.equal(by.attributionText,
    '"Whoosh" by Kinoton (https://freesound.org/s/1/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).');
  const zero = licenseFields(meta, 'cc0');
  assert.equal(zero.requiresAttribution, false);
  assert.match(zero.attributionText, /public domain under CC0/);
  const unk = licenseFields(meta, null);
  assert.equal(unk.requiresAttribution, true);
  assert.equal(unk.allowsCommercialUse, false);
  assert.match(attributionLine({...meta, license: 'unknown', licenseUrl: null}), /License unknown/);
});
