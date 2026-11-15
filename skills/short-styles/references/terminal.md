# terminal: the phosphor CLI

**Feels like:** a hacker documentary: green phosphor on black, CRT scanlines, glitch cuts, a session streaming by.
**Use for:** CLIs and TUIs, dev tooling, security research, self-hosting, anything where the product *is* a command.

**Look (automatic):** `phosphor` palette; IBM Plex Mono everywhere. *Emphasis* = solid phosphor accent. Cards are square boxes with glowing borders. Transitions are `glitch` and hard cuts. Hits are an RGB glitch burst. A CRT overlay sits on top, and a flickering grid sits behind. Captions are mono, prefixed with `>`, with the active word as an inverted block.

## Beat sheet (30–38s: 5 beats — payoff, what it is, two "wait, really?" details, the question; see the retention rules in SKILL.md)
| # | scene | job |
|---|---|---|
| 1 | `type` scramble | the claim, e.g. "*grep* for your whole life" |
| 2 | `log` | the tool running: real commands and real output, 5–8 lines |
| 3 | `code` (`terminal: true`) or `steps` | install / the one command that matters |
| 4 | `stat` | stars / speed / size, sourced |
| 5 | `cta` | the question back (e.g. "Would you *pipe* your life into it?") |

## Voice
Terse and imperative, like a sysadmin explaining over your shoulder. Verbs first. Numbers spoken as words.

## Do / don't
- Do: copy `log` lines from the README or demo output. Prefixes: `$ ` command (typed), `+ ` success (✓), `! ` warning (▲), `> ` info (dim). Lines ≤ 40 characters, max 11 lines.
- Do: set `log.title` to the tool name; it glitches in a `[ title ]` header.
- Don't: use invented commands or flags, bento/clipping scenes, or soft explainer pacing.

## Example
```json
{"style": "terminal", "scenes": [
  {"type": "type", "style": "scramble", "text": "Debloat your *TV*", "vo": "One open-source tool. One command. *No more TV ads.*"},
  {"type": "log", "title": "cleanyourtv", "lines": ["$ adb connect 192.168.1.42", "+ connected", "$ claude \"disable ad apps\"", "! 14 ad + telemetry apps", "+ disabled 14 packages"], "vo": "It connects over Wi-Fi, finds the ad and telemetry apps, and *disables every one.*"},
  {"type": "stat", "value": 17600, "label": "GitHub *stars*", "vo": "Seventeen thousand stars in four days."},
  {"type": "cta", "headline": "Would you *run* it?", "url": "github.com/Gathin23/cleanyourtv", "vo": "Would you run it on your TV?"}
]}
```
