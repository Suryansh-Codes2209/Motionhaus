# neon: the 21st.dev showcase

**Feels like:** a modern SaaS launch page come alive: aurora glow, a synthwave grid floor, glassy bento tiles with light running around their edges, shimmering headlines.
**Use for:** AI products, agents, polished UIs, design and creative tools, anything whose screenshots look premium.

**Look (automatic):** `ultraviolet` (or `ice`/`signal`) dark palette; Unbounded headlines and Geist body. *Emphasis* = gradient text with a shimmer sweep and glow. Cards are dark glass. Transitions are zoom-punch, push and slide. Hits are an accent flash, sparks and light leaks. Captions have a glowing active word.

## Beat sheet (30–38s: 5 beats — payoff, what it is, two "wait, really?" details, the question; see the retention rules in SKILL.md)
| # | scene | job |
|---|---|---|
| 1 | `type` scramble, or `hook` | the promise, e.g. "Prompt → *production UI*" |
| 2 | `spotlight` | the product: cursor clicks the hero feature |
| 3 | `bento` | what it does: hero tile with a screenshot plus 2–4 small tiles |
| 4 | `chat` or `stat` | the magic moment (real prompt/answer) or traction |
| 5 | `cta` | the question back |

## Voice
Energetic but specific. Lead with the outcome, then the how, in one breath. Product nouns over adjectives.

## Do / don't
- Do: give the bento hero tile `image` (a strong capture). Small-tile titles ≤ 3 words with an emoji `icon`. At most 5 tiles.
- Do: keep headlines short. Unbounded is wide and auto-shrinks, so ≤ 28 characters reads best.
- Don't: use paper or terminal scenes (`clipping`, `document`, `log`), or more than one chart.

## Example
```json
{"style": "neon", "scenes": [
  {"type": "type", "style": "scramble", "text": "Prompt to *real UI*", "vo": "Someone just shipped an agent that turns one prompt into *production UI.*"},
  {"type": "bento", "title": "What it *does*", "tiles": [{"title": "Builds whole screens", "desc": "React + Tailwind", "image": "site/hero.png"}, {"icon": "🎨", "title": "Your design system"}, {"icon": "⚡", "title": "Live preview"}, {"icon": "🔁", "title": "Iterates in chat"}], "vo": "It builds whole screens in your design system, with a live preview you can *keep editing in chat.*"},
  {"type": "stat", "value": 312, "label": "points on *Hacker News*", "vo": "Three hundred points on Hacker News in a day."},
  {"type": "cta", "headline": "Would you *ship* this?", "url": "example.dev", "vo": "Would you ship what it builds?"}
]}
```
