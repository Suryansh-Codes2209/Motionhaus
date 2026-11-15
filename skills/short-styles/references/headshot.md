# headshot: the talking-head split

**Feels like:** a creator recommending tools: the top half is a cream graphics panel (toy-box tiles, numbers, captures), the bottom half is the speaker, with bold white captions riding on the face and jump cuts with a punch-in between lines.
**Use for:** recommendations and reactions: "3 free tools for…", tips, "stop doing X", a personal take on a launch. The person *is* the reason to watch.

**Look (automatic):** toy-box tokens (`toybox` palette, Instrument Serif, white tiles, `pop` transitions, confetti) inside the top 53% panel; scenes are laid out full-frame and shown at 0.85 scale with only the middle ~60% of the frame visible (19–81% of its height), so keep content compact and central; the dateline kicker is hidden. Captions sit just under the panel.

## The speaker
- **Recorded take (best):** set `"face": "take.mp4"` (or `{"src": "take.mp4", "focusY": 0.3}`) in script.json, a path from the episode folder. Record yourself reading every scene's `vo` in order, then the outro's `vo`, in one take, phone upright, face in the upper third. The take's audio **is** the voiceover (no TTS). Whisper times it, the script is aligned to it, and each scene plays its own stretch of the footage in sync. Between lines the face holds a frame, and alternate lines punch in 12%. Needs the whisper model. Read the script exactly (ad-libs throw off the alignment).
- **No take:** the channel's mascot talks the TTS voiceover in the bottom half.

## Beat sheet (30–38s: 5 beats — payoff, what it is, two "wait, really?" details, the question; see the retention rules in SKILL.md)
| # | scene | job |
|---|---|---|
| 1 | `hook` | the itch, said to camera |
| 2 | `tiles` | the problem (`strike`) |
| 3–4 | `tiles` / `stat` / `screenshot` / `code` | one tool per scene, a number or a capture |
| 5 | `cta` | "comment X and I'll send the links" style question |

## Do / don't
- Do: one idea per scene and short `vo` lines (2–8 s each): the jump cuts land on them.
- Do: titles ≤ 22 characters; the panel is small.
- Don't: `document`, `log`, `flow`, `bento` (too dense for the panel).
- Don't: an ad-libbed take. Fix the script to what you said, or re-record.
