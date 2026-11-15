# toybox: soft tiles and stickers

**Feels like:** a creator's tool tip on Instagram: warm cream paper, white app-icon tiles that bounce in, a red ✕ or green ✓ badge, a "FREE" sticker slapped on, italic serif emphasis in orange.
**Use for:** small tools, plugins, Claude Code skills, libraries, "this free thing fixes X", anything whose point is *how easy it is*.

**Look (automatic):** `toybox` palette (cream, ink, orange, sticker yellow); Instrument Serif headlines, Inter body. *Emphasis* = italic serif in the accent with a hand underline. Cards are white with a soft shadow and big radius. Transitions are `pop` (shrink away, spring up with overshoot) and slides. Hits are soft confetti. Captions are the italic serif in capitals, the spoken word lifting into the accent. Stat numbers switch to heavy Inter (the serif can't carry a big number).

## Beat sheet (30–38s: 5 beats — payoff, what it is, two "wait, really?" details, the question; see the retention rules in SKILL.md)
| # | scene | job |
|---|---|---|
| 1 | `hook` | the itch, two lines: "Looks *pro.*" / "Sounds like *this.*" |
| 2 | `tiles` | the problem as icons: "Claude ✕ audio" (`strike`) |
| 3 | `tiles` / `steps` | the fix: the tool's icons, `check` + `sticker: "FREE"` |
| 4 | `stat` | the number that makes it real (sounds, stars, installs) |
| 5 | `cta` | the question back |

## Voice
Friendly and quick, second person ("your edits"). One idea per line. Name the tool early.

## Do / don't
- Do: emoji or a real logo path for `icon`; labels ≤ 10 characters (they're chips).
- Do: one `strike` per short (the problem) and one `check`/`sticker` (the fix). Overused, they stop meaning anything.
- Don't: dark captures in `screenshot` (they punch a hole in the paper); prefer `tiles`, `steps`, `stat`.
- Don't: use `bento`, `log`, `clipping` (other styles' signatures).

## Example
```json
{"style": "toybox", "scenes": [
  {"type": "hook", "lines": ["Looks *pro.*", "Sounds like *this.*"], "vo": "Why do your Claude edits look pro, but sound like a *silent movie?*"},
  {"type": "tiles", "title": "Claude *can't hear*", "tiles": [{"icon": "✳️", "label": "Claude"}, {"icon": "👂", "label": "audio"}], "strike": 1, "vo": "Claude can't hear, so it fakes the sound."},
  {"type": "tiles", "title": "Real sounds, *free*", "tiles": [{"icon": "🔎", "label": "Openverse"}, {"icon": "🎬", "label": "Real SFX"}, {"icon": "👂", "label": "earshot"}], "check": 2, "sticker": "FREE", "badgeOn": 0, "vo": "Three free tools fix that."},
  {"type": "stat", "value": 5220123, "label": "free sounds", "vo": "Openverse alone has over five million."},
  {"type": "cta", "headline": "Which one *first?*", "url": "github.com/Leonxlnx/earshot", "vo": "Which one are you trying first?"}
]}
```
