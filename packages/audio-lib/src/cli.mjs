#!/usr/bin/env node
// Command-line access to the audio library, for humans and scripts.
//   node packages/audio-lib/src/cli.mjs search "<query>" --type sfx [--max 3] [--any-license] [--limit 5]
//   node packages/audio-lib/src/cli.mjs fetch <id> [--dest <dir>]
//   node packages/audio-lib/src/cli.mjs credits <dir> [--format text|markdown|json]
//   node packages/audio-lib/src/cli.mjs providers
//   node packages/audio-lib/src/cli.mjs sfx-kit [--rebuild] [--offline]   real SFX kit for Shorts/Reels (cached)
//   node packages/audio-lib/src/cli.mjs refs search "<query>" [--sources curated,youtube-rss] [--limit 5] [--since 2026-01-01]
//   node packages/audio-lib/src/cli.mjs refs analyze <url>
//   node packages/audio-lib/src/cli.mjs refs brief "<product description>" <url> [<url> …]
//   node packages/audio-lib/src/cli.mjs refs save <url> [--notes "…"] [--tags a,b]
import path from 'node:path';
import {parseArgs} from 'node:util';
import {loadDotEnv} from './env.mjs';
import {createAudioLibrary, ROOT_DIR} from './library.mjs';
import {createReferenceLibrary} from './references/index.mjs';
import {createReferenceToolHandlers} from './references/tools.mjs';
import {createToolHandlers} from './tools.mjs';

loadDotEnv(path.join(ROOT_DIR, '.env'));
const {positionals, values} = parseArgs({
  allowPositionals: true,
  options: {
    type: {type: 'string', default: 'sfx'},
    max: {type: 'string'},
    min: {type: 'string'},
    limit: {type: 'string', default: '8'},
    'any-license': {type: 'boolean', default: false},
    dest: {type: 'string'},
    format: {type: 'string', default: 'text'},
    sources: {type: 'string'},
    since: {type: 'string'},
    notes: {type: 'string'},
    tags: {type: 'string'},
    rebuild: {type: 'boolean', default: false},
    offline: {type: 'boolean', default: false},
  },
});
const [cmd, arg, ...rest] = positionals;
/** @param {string | undefined} v */
const list = (v) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : undefined);

if (cmd === 'refs') {
  const refs = createReferenceToolHandlers(createReferenceLibrary({rootDir: ROOT_DIR}));
  /** @type {Record<string, () => Promise<unknown>>} */
  const sub = {
    search: () => refs.search_launch_references({query: rest[0] ?? '', sources: list(values.sources), maxResults: Number(values.limit), sinceDate: values.since}),
    analyze: () => refs.analyze_reference({url: rest[0]}),
    brief: () => refs.build_launch_brief({productDescription: rest[0], referenceUrls: rest.slice(1)}),
    save: () => refs.save_reference({url: rest[0], notes: values.notes, tags: list(values.tags) ?? []}),
  };
  if (!arg || !sub[arg]) {
    console.error('Usage: cli.mjs refs search "<query>" [--sources a,b] [--limit n] [--since date] | analyze <url> | brief "<desc>" <url>... | save <url> [--notes ..] [--tags a,b]');
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(await sub[arg](), null, 2));
  } catch (err) {
    console.error(`Error: ${/** @type {Error} */ (err).message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (cmd === 'sfx-kit') {
  const {ensureKit, describeKit} = await import('./sfxkit.mjs');
  try {
    const {kit, kitDir} = await ensureKit({rebuild: values.rebuild, offline: values.offline});
    console.log(`${kitDir}/kit.json (built ${kit.builtAt})`);
    for (const l of describeKit(kit)) console.log(`  ${l}`);
  } catch (err) {
    console.error(`Error: ${/** @type {Error} */ (err).message}`);
    process.exit(1);
  }
  process.exit(0);
}

const lib = createAudioLibrary();
const tools = createToolHandlers(lib);

try {
  if (cmd === 'search' && arg) {
    const out = await tools.search_audio({
      query: arg,
      type: values.type,
      maxDurationSec: values.max ? Number(values.max) : undefined,
      minDurationSec: values.min ? Number(values.min) : undefined,
      commercialUseOnly: !values['any-license'],
      limit: Number(values.limit),
    });
    console.log(JSON.stringify(out, null, 2));
  } else if (cmd === 'fetch' && arg) {
    console.log(JSON.stringify(await tools.fetch_audio({id: arg, destDir: values.dest}), null, 2));
  } else if (cmd === 'credits' && arg) {
    process.stdout.write(await lib.exportAttribution(arg, /** @type {any} */ (values.format)));
  } else if (cmd === 'providers') {
    console.log(JSON.stringify(lib.providers, null, 2));
  } else {
    console.error('Usage: cli.mjs search "<query>" [--type music|sfx] [--max s] [--min s] [--limit n] [--any-license]');
    console.error('       cli.mjs fetch <id> [--dest dir] | credits <dir> [--format text|markdown|json] | providers');
    console.error('       cli.mjs sfx-kit [--rebuild] [--offline]   (real SFX kit for Shorts/Reels)');
    console.error('       cli.mjs refs search|analyze|brief|save … (launch-video references)');
    process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${/** @type {Error} */ (err).message}`);
  process.exit(1);
}
