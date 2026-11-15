#!/usr/bin/env node
// Stdio MCP server exposing the audio tools (search_audio, fetch_audio) and the
// launch-reference tools (search_launch_references, analyze_reference,
// save_reference, build_launch_brief). Hand-rolled JSON-RPC
// so the plugin needs no `npm install` to run. stdout carries protocol
// messages only; all logging goes to stderr.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {loadDotEnv} from './env.mjs';
import {createAudioLibrary, ROOT_DIR} from './library.mjs';
import {createReferenceLibrary} from './references/index.mjs';
import {createReferenceToolHandlers, REFERENCE_TOOLS} from './references/tools.mjs';
import {createToolHandlers, TOOLS} from './tools.mjs';

const SUPPORTED = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

/**
 * @param {Record<string, (args: any) => Promise<unknown>>} handlers
 * @param {object[]} [tools]  tool definitions advertised by tools/list
 * @returns {(msg: any) => Promise<object | null>}  JSON-RPC response, or null for notifications
 */
export function createDispatcher(handlers, tools = TOOLS) {
  return async (msg) => {
    const {id, method, params} = msg ?? {};
    const isRequest = id !== undefined && id !== null;
    /** @param {object} result */
    const ok = (result) => (isRequest ? {jsonrpc: '2.0', id, result} : null);
    /** @param {number} code @param {string} message */
    const fail = (code, message) => (isRequest ? {jsonrpc: '2.0', id, error: {code, message}} : null);

    switch (method) {
      case 'initialize':
        return ok({
          protocolVersion: SUPPORTED.includes(params?.protocolVersion) ? params.protocolVersion : SUPPORTED[0],
          capabilities: {tools: {}},
          serverInfo: {name: 'launchreel-audio', version: '0.2.0'},
          instructions: [
            'Free music/SFX search with license handling. Prefer commercialUseOnly=true and always report the attribution line from fetch_audio to the user.',
            'Launch-video reference research: search_launch_references → analyze_reference (3–5) → build_launch_brief. Report "unknown" fields as unknown; never invent them.',
          ].join(' '),
        });
      case 'ping':
        return ok({});
      case 'tools/list':
        return ok({tools});
      case 'tools/call': {
        const handler = Object.hasOwn(handlers, params?.name) ? handlers[params.name] : undefined;
        if (!handler) return fail(-32602, `Unknown tool: ${params?.name}`);
        try {
          const out = /** @type {Record<string, unknown>} */ (await handler(params.arguments ?? {}));
          return ok({content: [{type: 'text', text: JSON.stringify(out, null, 1)}], structuredContent: out});
        } catch (err) {
          return ok({content: [{type: 'text', text: `Error: ${/** @type {Error} */ (err).message}`}], isError: true});
        }
      }
      default:
        if (typeof method === 'string' && method.startsWith('notifications/')) return null;
        return fail(-32601, `Method not found: ${method}`);
    }
  };
}

/** @param {string} f */
const real = (f) => {
  try {
    return fs.realpathSync(f);
  } catch {
    return path.resolve(f);
  }
};
const isMain = !!process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url));
if (isMain) {
  loadDotEnv(path.join(ROOT_DIR, '.env'));
  const handlers = {
    ...createToolHandlers(createAudioLibrary()),
    ...createReferenceToolHandlers(createReferenceLibrary({rootDir: ROOT_DIR})),
  };
  const dispatch = createDispatcher(handlers, [...TOOLS, ...REFERENCE_TOOLS]);
  const rl = readline.createInterface({input: process.stdin});
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      process.stdout.write(JSON.stringify({jsonrpc: '2.0', id: null, error: {code: -32700, message: 'Parse error'}}) + '\n');
      return;
    }
    const res = await dispatch(msg);
    if (res) process.stdout.write(JSON.stringify(res) + '\n');
  });
}
