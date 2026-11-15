// Optional sound QA with earshot (github.com/Leonxlnx/earshot, MIT): scores a
// finished film's mix against professional launch films and lists timestamped
// fixes (sound on cuts, realness of the SFX, loudness shape, music presence).
// Not a dependency: runs only when `earshot` is on PATH, EARSHOT_BIN, or the
// repo's install in workspace/shorts/cache/earshot.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export const INSTALL_HINT =
  'earshot not installed (optional): clone https://github.com/Leonxlnx/earshot and pip install it into a venv (README "Install"), then put its .venv/bin on PATH or set EARSHOT_BIN';

/** Path of the earshot executable, or null. @param {Record<string, string | undefined>} [env] */
export async function findEarshot(env = process.env) {
  const ok = (/** @type {string} */ f) => fs.access(f, fs.constants.X_OK).then(() => true, () => false);
  if (env.EARSHOT_BIN) return (await ok(env.EARSHOT_BIN)) ? env.EARSHOT_BIN : null;
  for (const dir of (env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    const f = path.join(dir, 'earshot');
    if (await ok(f)) return f;
  }
  // the repo's own install (see skills/video-studio): workspace/shorts/cache/earshot/.venv
  const repo = path.resolve(env.MOTIONHAUS_DATA || path.join(import.meta.dirname, '..', '..', '..', 'workspace'), 'shorts', 'cache', 'earshot', '.venv', 'bin', 'earshot');
  if (await ok(repo)) return repo;
  return null;
}

/**
 * The parts of an `earshot critique --json` result we act on. Defensive: any
 * missing field comes back empty rather than throwing.
 * @param {any} r
 */
export function summarize(r) {
  const actions = Array.isArray(r?.actions) ? r.actions : [];
  return {
    verdict: typeof r?.verdict === 'string' ? r.verdict : 'n.a.',
    score: typeof r?.score === 'number' ? r.score : null,
    inRange: r?.in_range ?? null,
    scored: r?.scored ?? null,
    fixes: actions.map((/** @type {any} */ a) => (typeof a === 'string' ? a : `[${a?.weight ?? '?'}] ${a?.action ?? JSON.stringify(a)}`)),
    tips: Array.isArray(r?.tips) ? r.tips.map(String) : [],
  };
}

/**
 * @typedef {{ok: true, missing?: false, file: string, out: string, verdict: string, score: number | null,
 *   inRange: number | null, scored: number | null, fixes: string[], tips: string[], text: string | null}
 *   | {ok: false, missing: true, message: string} | {ok: false, missing?: false, message: string}} Critique
 */

/**
 * Run `earshot critique <mp4> --json` and save the full result next to the
 * film as <name>.earshot.json.
 * @param {string} file @param {{bin?: string | null, env?: Record<string, string | undefined>, fast?: boolean}} [o]
 * @returns {Promise<Critique>}
 */
export async function critique(file, o = {}) {
  const bin = o.bin ?? (await findEarshot(o.env));
  if (!bin) return {ok: false, missing: true, message: INSTALL_HINT};
  if (!(await fs.stat(file).catch(() => null))) return {ok: false, message: `${file} not found: render it first`};
  const out = file.replace(/\.[a-z0-9]+$/i, '') + '.earshot.json';
  const args = ['critique', file, '--json', '--out', out, ...(o.fast ? ['--fast'] : [])];
  const {code, stdout, stderr} = await new Promise((resolve, reject) => {
    const p = spawn(bin, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let so = '';
    let se = '';
    p.stdout.on('data', (d) => (so += d));
    p.stderr.on('data', (d) => (se += d));
    p.on('error', reject);
    p.on('exit', (c) => resolve({code: c, stdout: so, stderr: se}));
  });
  if (code !== 0) return {ok: false, message: stderr.trim().split('\n').pop() || `earshot exited ${code}`};
  const raw = await fs.readFile(out, 'utf8').catch(() => stdout);
  let r;
  try {
    r = JSON.parse(raw);
  } catch {
    return {ok: false, message: `earshot gave no JSON: ${stdout.slice(0, 200)}`};
  }
  return {ok: true, file, out, ...summarize(r), text: typeof r.text === 'string' ? r.text : null};
}

/** Human summary of a critique. @param {Critique} c */
export function formatCritique(c) {
  if (!c.ok) return c.message;
  const head = `earshot: ${c.verdict}${c.score !== null ? ` (score ${c.score}${c.scored ? `, ${c.inRange}/${c.scored} metrics in range` : ''})` : ''}`;
  const fixes = c.fixes.length ? ['fix first:', ...c.fixes.slice(0, 10).map((f, i) => `  ${i + 1}. ${f}`)] : ['no fixes'];
  return [head, ...fixes, ...c.tips.slice(0, 5).map((t) => `  tip: ${t}`), `full result → ${c.out}`].join('\n');
}
