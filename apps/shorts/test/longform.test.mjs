import assert from 'node:assert/strict';
import {test} from 'node:test';
import {output, withChapters} from '../src/steps/make.mjs';

test('withChapters: fills the {{chapters}} line, else goes after the first paragraph', () => {
  const lines = ['0:00 The hook', '0:20 How it works'];
  assert.equal(withChapters('Intro.\n\n{{chapters}}\n\n#tags', lines), 'Intro.\n\n0:00 The hook\n0:20 How it works\n\n#tags');
  assert.equal(withChapters('Intro.\n\nLinks', lines), 'Intro.\n\n0:00 The hook\n0:20 How it works\n\nLinks');
  assert.equal(withChapters('Intro.\n{{chapters}}\nLinks', []), 'Intro.\nLinks');
});

test('output: composition + file name by format', () => {
  assert.deepEqual(output({config: {format: '16:9'}}), {comp: 'Long', name: 'long'});
  assert.deepEqual(output({config: {format: '9:16'}}), {comp: 'Short', name: 'short'});
});
