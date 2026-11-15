# Retention research (2026-10-23)

What we found on which edit style and pacing keep viewers watching long-form. **Nothing here is hard data.** Most sources are creator blogs, and their numbers disagree. Treat this as a starting point and let our own YouTube Analytics retention graphs overrule it.

## Findings

- **The Vox style is "show, then explain."** Johnny Harris describes it as frequent first-hand visuals (clippings, documents, maps) that show the evidence before the narration explains it, rather than long talking stretches. Vox's video lead says the visuals must carry information, not decoration. [Press Gazette](https://pressgazette.co.uk/vox-youtube/)
- **Visuals that illustrate the line beat cutting for its own sake.** This comes from a single creator's controlled test (anecdotal): B-roll raised retention 3–7% only when it showed what was being said, and over-cutting caused drop-offs at the transitions. [Opus](https://www.opus.pro/blog/does-b-roll-increase-watch-time)
- **There's no proven cut interval.** Guides range from a visual change every 10–15s to one every 90–120s. Several say heavy editing *lowers* retention for viewers over 25. Our audience is developers, mostly 25+, so keep the pacing calm but steady. [AIR Media-Tech](https://air.io/en/youtube-hacks/advanced-retention-editing-cutting-patterns-that-keep-viewers-past-minute-8), [Socialkit](https://socialk.it/en/blog/youtube-audience-retention-guide)
- **The first ~10s decide whether people stay**, hence the cold hook, open loop and re-hooks in SKILL.md. [Pippit](https://pippit.capcut.com/resource/top-tips-for-building-audience-retention-on-faceless-youtube-channels)
- YouTube has no official "pattern interrupt" metric. The way to judge a cut is to check the retention graph at that timestamp. [Creator Essentials](https://www.creatoressentials.com/glossary/pattern-interrupt/)

## Custom motion graphics (searched 2026-11-13)

- No controlled study compares custom motion graphics with stock footage; the retention figures online (70–85% vs 50–65%, "95% vs 30%") come from studios that sell animation and give no method. [AIR Media-Tech](https://air.io/en/audience-growth/why-investing-in-motion-graphics-can-double-your-viewer-retention), [Fotor](https://www.fotor.com/blog/do-you-actually-need-motion-graphics/)
- The best-described test (Cognitive, same voiceover as talking head vs animation): +15% information retention, 66% more shares for the animated cut; sample and method not given. [Cognitive](https://cognitive-media.squarespace.com/explainer-animation-research)
- Motion helps when it clarifies complex or data-heavy material; too many moving things at once raises cognitive load, and bad graphics hurt more than none. [Fotor](https://www.fotor.com/blog/do-you-actually-need-motion-graphics/)
- Shorts: a vendor's review of 500 faceless Shorts over 1M views found text as the main layer with motion graphics supporting it, a moving first frame, and a visual change every 2–4 s. [EasyViral](https://easyviral.ai/blog/we-analyzed-500-viral-faceless-shorts), [Fluxnote](https://fluxnote.io/guides/faceless-shorts-retention-tips-2026)
- So: 2–4 custom SVG graphics per long-form on mechanism and proof beats, 1 per short. Rules in `skills/short-styles/references/motion-vocabulary.md` §5c.

## What we do with it

| Story angle | Long-form style |
|---|---|
| "Why it matters", drama, pushback, a trend, a licensing fight | `vox` (clippings, documents, real comments as evidence) |
| "How it works": a framework, protocol or tool mechanism | `explainer` (flow diagrams show the mechanism) |
| Security, CLI, self-hosted tools | `terminal` (log output as the demo) |

- Every scene must **show what the VO is saying at that moment**. Never add a cut just to have one.
- Change the visual every ~6–10s through scene changes or in-scene motion, never with frantic cutting.
- **Experiment:** alternate `vox` and `explainer` across long-forms. The first long-form (#011 Reylo, 2026-10-23) is `explainer`, so the next is `vox`. After 4–6 long-forms, compare average view duration and the retention curves by style in YouTube Analytics, then update this file with our real numbers.

## Our results

| # | launch | style | length | avg view duration | avg % viewed | notes |
|---|---|---|---|---|---|---|
| 011 | Reylo | explainer | 2:14 | | | first long-form |
| 031 | eMudhra | vox | | | | |
| 074 | S2Arm | neon | 2:22 | | | first with mask edits (text-behind-subject hook, 3 mask transitions, window type) and per-chapter photo/footage plates, 2 custom SVG graphics; 0 card scenes |
