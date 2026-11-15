# vox: the newsprint explainer

**Feels like:** a Vox/Johnny Harris desk edit. Paper, cut-outs, marker pens, someone pointing at the evidence.
**Use for:** trends ("devs are doing X"), fights and controversies, policy, open-source drama, "why this matters".

**Look (automatic):** `newsprint` paper with fibres and a centre fold; Playfair Display headlines and Inter body; Courier Prime labels. *Emphasis* = yellow marker swipe. Cards are paper with hard ink shadows and a slight hand-placed tilt. Transitions are `paper` (the next sheet slides over the last) and `wipe`. Hits are a soft paper flash, with no sparks. Captions sit on a paper strip with the active word marker-swiped.

## Beat sheet (30–38s: 5 beats — payoff, what it is, two "wait, really?" details, the question; see the retention rules in SKILL.md)
| # | scene | job |
|---|---|---|
| 1 | `type` slam, or `hook` | the provocation, ≤ 5 words, e.g. "Your TV is *watching* you" |
| 2 | `clipping` | the evidence: the repo/site/post as a clipping, circled (`mark: circle`) or underlined |
| 3 | `document` | the key sentence from the README/post, marker-swept (verbatim) |
| 4 | `comment`, `versus` or `stat` | the reaction / the stakes / the number |
| 5 | `type` or `cta` | the question back to the viewer |

## Voice
Curious narrator who found something. Short declaratives, then a turn: "Here's the thing." / "But there's a catch." One rhetorical question at most before the CTA. Third person.

## Do / don't
- Do: `mark: "circle"` for a name or number, `"underline"` for a phrase, `"highlight"` for a sentence. Set `focus` by looking at the capture (x/y are the centre, 0..1; w/h are the mark's size).
- Do: use `site/hero.png` or a README screenshot for clippings. Product UIs and headlines both work.
- Don't: use bento, log or flow, or long feature lists. Vox is about one idea, shown with evidence.

## Example
```json
{
  "episode": 8, "sourceLabel": "GitHub", "style": "vox",
  "brand": {"name": "CleanYourTV", "url": "github.com/Gathin23/cleanyourtv", "font": "Inter", "colors": {"bg": "#000", "fg": "#fff", "muted": "#888", "accent": "#fc0", "accent2": "#f30"}},
  "scenes": [
    {"type": "type", "style": "slam", "text": "Your TV is *watching* you", "vo": "Your smart TV is an ad machine. Developers just found a way to *switch it off.*"},
    {"type": "clipping", "image": "site/hero.png", "focus": {"x": 0.5, "y": 0.32, "w": 0.55, "h": 0.16}, "mark": "circle", "label": "17,600 stars in four days", "vo": "It's called CleanYourTV, and it went *viral* on GitHub this week."},
    {"type": "document", "title": "README.md", "source": "github.com", "body": "<real README paragraph>", "quote": "disable ad and telemetry apps", "vo": "An AI coding agent connects over Wi-Fi and disables the *ad and telemetry apps.*"},
    {"type": "versus", "left": {"name": "Stock", "rows": [{"label": "Ad rows", "value": "Yes"}]}, "right": {"name": "Cleaned", "rows": [{"label": "Ad rows", "value": "No"}]}, "winner": "right", "vo": "Nothing gets uninstalled, so it can all be *undone.*"},
    {"type": "type", "style": "slam", "text": "Would you *risk it?*", "vo": "Would you let an AI rewire your TV, or just buy a *dumb one?*"}
  ],
  "outro": {"text": "Follow for tomorrow's launch", "vo": "Follow for tomorrow's launch."}
}
```
