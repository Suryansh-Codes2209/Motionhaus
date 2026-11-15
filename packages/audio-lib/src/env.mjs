// Minimal .env loader (Node 18 has no process.loadEnvFile). Real environment
// variables always win over the file. Only used by the entry points.
import fs from 'node:fs';

/** @param {string} file @param {Record<string, string | undefined>} [target] */
export function loadDotEnv(file, target = process.env) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (target[m[1]] === undefined && v !== '') target[m[1]] = v;
  }
}
