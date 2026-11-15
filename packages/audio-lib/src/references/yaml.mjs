// A deliberately small YAML subset, so the plugin runs without `npm install`.
// Supported: a top-level list of flat maps (`- key: value`), comments, plain /
// "double" / 'single' quoted scalars, numbers, booleans, null, flow lists
// (`[a, "b c"]`), block lists (`key:` then `  - item`) and literal/folded
// block scalars (`key: |` / `key: >`). Anything else is a parse error with a
// line number rather than a silent misread.

export class YamlError extends Error {
  /** @param {string} message @param {number} line 1-based */
  constructor(message, line) {
    super(`line ${line}: ${message}`);
    this.name = 'YamlError';
    this.line = line;
  }
}

/** @typedef {string | number | boolean | null | string[]} Scalar */
/** @typedef {Record<string, Scalar>} Item */

/** Strip a trailing ` # comment` outside quotes. @param {string} s */
function stripComment(s) {
  let q = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '\\' && q === '"') i++;
      else if (c === q) q = '';
    } else if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).trimEnd();
  }
  return s.trimEnd();
}

/** @param {string} raw @param {number} line @returns {Scalar} */
export function parseScalar(raw, line) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      throw new YamlError(`bad double-quoted string: ${s}`, line);
    }
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new YamlError(`unterminated single-quoted string: ${s}`, line);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new YamlError(`unterminated flow list: ${s}`, line);
    return splitFlow(s.slice(1, -1), line).map((x) => {
      const v = parseScalar(x, line);
      if (Array.isArray(v)) throw new YamlError('nested lists are not supported', line);
      return v === null ? '' : String(v);
    }).filter((x) => x !== '');
  }
  if (/^[{&*!|>%@`]/.test(s)) throw new YamlError(`unsupported YAML syntax: ${s}`, line);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/** Split `a, "b, c", 'd'` on top-level commas. @param {string} s @param {number} line */
function splitFlow(s, line) {
  /** @type {string[]} */
  const out = [];
  let cur = '';
  let q = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      cur += c;
      if (c === '\\' && q === '"') cur += s[++i] ?? '';
      else if (c === q) q = '';
    } else if (c === '"' || c === "'") {
      q = c;
      cur += c;
    } else if (c === ',') {
      out.push(cur.trim());
      cur = '';
    } else if (c === '[') throw new YamlError('nested lists are not supported', line);
    else cur += c;
  }
  if (q) throw new YamlError('unterminated string in flow list', line);
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * @param {string} text
 * @returns {Item[]}
 */
export function parseYamlList(text) {
  const lines = text.split(/\r?\n/);
  /** @type {Item[]} */
  const items = [];
  /** @type {Item | null} */
  let cur = null;
  let keyIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const n = i + 1;
    const rawLine = lines[i];
    if (/^\s*(#.*)?$/.test(rawLine)) continue;
    if (rawLine.includes('\t')) throw new YamlError('tabs are not allowed for indentation', n);
    const indent = rawLine.length - rawLine.trimStart().length;
    let body = rawLine.trim();

    if (indent === 0 && body === '---') continue;
    if (indent === 0 && body.startsWith('- ')) {
      cur = {};
      items.push(cur);
      keyIndent = 2;
      body = body.slice(2).trim();
      if (!body) continue;
    } else if (indent === 0 && body === '-') {
      cur = {};
      items.push(cur);
      keyIndent = 2;
      continue;
    } else if (!cur) {
      throw new YamlError('expected a list item starting with "- " at the top level', n);
    } else if (indent !== keyIndent) {
      throw new YamlError(`unexpected indentation (expected ${keyIndent} spaces)`, n);
    }

    const m = body.match(/^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/);
    if (!m) throw new YamlError(`expected "key: value", got: ${body}`, n);
    const key = m[1];
    const rest = stripComment(m[2] ?? '');
    const item = /** @type {Item} */ (cur);
    if (key in item) throw new YamlError(`duplicate key "${key}"`, n);

    if (rest === '|' || rest === '>' || rest === '|-' || rest === '>-') {
      /** @type {string[]} */
      const block = [];
      let blockIndent = -1;
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const ni = next.length - next.trimStart().length;
        if (next.trim() === '') {
          block.push('');
          i++;
          continue;
        }
        if (ni <= keyIndent) break;
        if (blockIndent < 0) blockIndent = ni;
        block.push(next.slice(Math.min(ni, blockIndent)));
        i++;
      }
      while (block.length && block[block.length - 1] === '') block.pop();
      item[key] = rest.startsWith('|') ? block.join('\n') : block.join('\n').replace(/([^\n])\n(?!\n)/g, '$1 ');
      continue;
    }
    if (rest === '') {
      // Block list?
      /** @type {string[]} */
      const list = [];
      while (i + 1 < lines.length && /^\s+-(\s|$)/.test(lines[i + 1]) && lines[i + 1].length - lines[i + 1].trimStart().length > keyIndent) {
        i++;
        const v = parseScalar(stripComment(lines[i].trim().slice(1)), i + 1);
        if (Array.isArray(v)) throw new YamlError('nested lists are not supported', i + 1);
        if (v !== null) list.push(String(v));
      }
      item[key] = list.length ? list : null;
      continue;
    }
    item[key] = parseScalar(rest, n);
  }
  return items;
}

/** @param {Scalar | undefined} v @returns {string} */
function dumpScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(String(x))).join(', ')}]`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

/**
 * Serialize one item as a YAML list entry (strings are always double-quoted,
 * which is valid YAML and round-trips through parseYamlList).
 * @param {Item} item
 */
export function dumpYamlItem(item) {
  const entries = Object.entries(item).filter(([, v]) => v !== undefined);
  return entries.map(([k, v], i) => `${i === 0 ? '- ' : '  '}${k}: ${dumpScalar(v)}`).join('\n') + '\n';
}
