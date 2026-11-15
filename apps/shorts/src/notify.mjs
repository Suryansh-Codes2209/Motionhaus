// Tells the owner what the unattended jobs did: one line in the autopilot
// log and a macOS notification banner. Nobody is watching these runs, so
// every post, skip and failure goes through here.
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} title @param {string} body
 * @param {{logFile: string, banner?: boolean}} o
 */
export async function notify(title, body, {logFile, banner = process.platform === 'darwin' && !process.env.MOTIONHAUS_NO_BANNER}) {
  const line = `${new Date().toISOString()}  ${title}  ${body.replace(/\s*\n\s*/g, ' · ')}\n`;
  await fs.mkdir(path.dirname(logFile), {recursive: true});
  await fs.appendFile(logFile, line);
  if (!banner) return;
  // The text goes in as arguments to a fixed script, never into the script
  // source, so a caption or error message cannot run as AppleScript.
  const script = 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv)\nend run';
  await new Promise((done) => execFile('osascript', ['-e', script, title, body.slice(0, 240)], {timeout: 10_000}, () => done(undefined)));
}
