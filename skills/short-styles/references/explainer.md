# explainer: the calm diagram

**Feels like:** a clean product explainer or a Stripe/Linear docs animation. Calm, precise, confident.
**Use for:** how something works: sync engines, protocols, infra, compilers, frameworks, data pipelines.

**Look (automatic):** `chalk` (light) canvas with a slowly drifting dot grid and a soft accent glow; Geist headlines and Inter body. *Emphasis* = solid accent colour. Cards are crisp white with soft shadows. Transitions are `blur` crossfades and slides. Hits are ripple rings. Captions sit in a dark pill with an accent underline on the active word.

## Beat sheet (30–38s: 5 beats — payoff, what it is, two "wait, really?" details, the question; see the retention rules in SKILL.md)
| # | scene | job |
|---|---|---|
| 1 | `hook` | the question it answers, e.g. "How do you sync *offline-first*?" |
| 2 | `screenshot` or `spotlight` | what it is (product shot) |
| 3 | `flow` | the mechanism: 3–5 nodes, each a verb phrase ("Writes locally" → "Merges with CRDTs" → "Syncs on reconnect") |
| 4 | `chart` or `stat` | the proof (benchmark, adoption), sourced |
| 5 | `cta` | the question back |

## Voice
A teacher who respects the viewer. Say what happens in order: "First… then… so…". No hype words. Name the trade-off once.

## Do / don't
- Do: keep `flow` node labels to ≤ 3 words and descs to ≤ 4. Use an emoji per node or leave `icon` out to get numbers.
- Do: use `steps` for a 3-step setup and `flow` for how data or work moves.
- Don't: use `type` slam, clippings or glitchy energy. If you need a punch line, use `hook`.

## Example
```json
{"style": "explainer", "scenes": [
  {"type": "hook", "lines": ["How does it stay", "in *sync* offline?"], "vo": "How do you build an app that works offline and never loses a write?"},
  {"type": "flow", "title": "How it *works*", "nodes": [{"icon": "✍️", "label": "Write locally", "desc": "instant, no server"}, {"icon": "🔀", "label": "Merge", "desc": "CRDTs, no conflicts"}, {"icon": "📡", "label": "Sync on reconnect"}], "vo": "Every write lands locally first, merges with CRDTs, and *syncs* when you're back online."},
  {"type": "stat", "value": 4200, "label": "GitHub *stars* in a week", "vo": "Developers noticed: four thousand stars in a week."},
  {"type": "cta", "headline": "Would you *build* on it?", "url": "example.dev", "vo": "Would you build on it?"}
]}
```
