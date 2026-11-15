// Chatterbox-Turbo (Resemble AI, MIT): a more natural, expressive voice than
// Kokoro, run locally on Apple Silicon through mlx-audio. It understands
// paralinguistic tags in the text ("[chuckle]", "[sigh]"), so a line can
// breathe. Needs the Python venv at workspace/shorts/cache/tts-venv
// (`python3 -m venv … && pip install mlx-audio`); the model downloads once.
// Optional series voice "ref": a ≥ 5 s clean wav to clone the channel voice.
import {spawn, execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import {promisify} from 'node:util';
import {spokenText, VOICE_CHAIN} from './kokoro.mjs';
import {probeSeconds} from './say.mjs';

const run = promisify(execFile);
export const CHATTERBOX_MODEL = 'mlx-community/chatterbox-turbo-fp16';

/**
 * @param {{venv: string, hfHome: string, model?: string, ref?: string, pronounce?: Record<string, string>}} o
 * @returns {import('../steps/make.mjs').Synth}
 */
export function createChatterbox({venv, hfHome, model = CHATTERBOX_MODEL, ref, pronounce}) {
  /** @type {Promise<{ask: (req: object) => Promise<any>}> | null} */
  let worker = null;
  const start = () => {
    worker ??= new Promise((resolve, reject) => {
      const py = spawn(path.join(venv, 'bin', 'python'), [path.join(import.meta.dirname, 'chatterbox.py'), model], {
        env: {...process.env, HF_HOME: hfHome, TOKENIZERS_PARALLELISM: 'false'},
        stdio: ['pipe', 'pipe', 'inherit'],
      });
      py.on('error', reject);
      py.on('exit', (code) => reject(new Error(`chatterbox worker exited (${code}); is mlx-audio installed in ${venv}?`)));
      /** @type {((v: any) => void)[]} */
      const waiting = [];
      const lines = readline.createInterface({input: /** @type {any} */ (py.stdout)});
      lines.on('line', (l) => {
        let msg;
        try {
          msg = JSON.parse(l);
        } catch {
          return; // library chatter on stdout
        }
        if (msg.ready) {
          idle();
          return resolve({
            ask: (req) =>
              new Promise((r) => {
                waiting.push(r);
                pipes.forEach((p) => p?.ref());
                py.stdin?.write(JSON.stringify(req) + '\n');
              }),
          });
        }
        waiting.shift()?.(msg);
        if (!waiting.length) idle();
      });
      // one worker per process: its pipes hold node open only while a request
      // is in flight, so node exits when the pipeline is done
      /** @type {any[]} */
      const pipes = [py.stdin, py.stdout];
      const idle = () => pipes.forEach((p) => p?.unref());
      process.on('exit', () => py.kill());
      py.unref();
    });
    return worker;
  };
  return async (text, outWav, ctx = {}) => {
    const w = await start();
    await fs.mkdir(path.dirname(outWav), {recursive: true});
    const raw = outWav.replace(/\.wav$/, '.raw.wav');
    const res = await w.ask({text: spokenText(text, {...pronounce, ...ctx.pronounce}), out: raw, ...(ref ? {ref} : {})});
    if (res.error) throw new Error(`chatterbox: ${res.error}`);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-af', VOICE_CHAIN, '-ar', '48000', '-ac', '1', outWav]);
    await fs.rm(raw);
    return {durationSec: await probeSeconds(outWav)};
  };
}
