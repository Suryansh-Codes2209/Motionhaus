# Channel brief: news, explained

Fill in the parts in *italics*, then delete this line. The numbers that the checks enforce live in `channel.json` (`rules`, `publish`); this brief explains the choices and tells the maker how to work.

## 1. What this channel covers

One thing that happened, and why it matters, in under a minute: *your beat, for example Indian tech policy, football transfers, space launches, your city*. It does not cover *what is outside your beat*, opinion with no event behind it, or a story that is still only a rumour.

## 2. Who watches

*Who they are: for example people who follow the beat but do not read the full article. What they should be able to say to a friend after watching.*

## 3. Voice and point of view

Plain and calm. The channel reports what sources say and explains it; it does not take a side in a dispute.

- Attribute: "the ministry said", "according to the filing".
- Separate what is known from what is expected. "Will" only for things already scheduled.
- No adjectives the sources did not earn ("shocking", "massive").

## 4. Where stories come from

Add your beat's feeds to `channel.json` → `stories.feeds` as `{"type": "rss", "url": "…", "label": "…"}`; `shorts run` then prints a shortlist. You may also search for the day's developments in *your beat*. Claim the story with `shorts story claim` before writing. The key names the event and its date (`rbi-rate-2026-11-14`), because the same subject will be in the news again.

## 5. What makes a story worth covering

- It happened in the last day or two, and there is a primary document or two independent reports.
- It changes something for the viewer, or it explains something they have been seeing.
- You can say why it matters in one sentence.
- Skip: a story with one anonymous source, a development nobody outside the newsroom would notice, a repeat of yesterday with nothing new. `shorts story claim` warns when a headline is close to an earlier one.

## 6. Sources of truth

A claim may rest on the primary document (the order, the filing, the paper, the official statement, the match report) or on two independent reports that agree. Every number names where it comes from and its date.

Never enough: a single social post, a screenshot of a document you could not find, an AI summary, a headline without the article.

Every claim is listed in `script.json` → `sources` with its link; the check fails without one. Before the final render, reopen each link and read the line it supports against the page. If the page does not say it, cut the line.

## 7. Never

- Health, legal or financial advice, or a prediction of a price, a result or a verdict.
- A named private person accused of anything.
- Graphic detail of violence or death; images of victims.
- A claim about a living person that the sources do not make in the same words.
- Present a dispute as settled.

## 8. Shape of an episode

Length and scene count are set in `channel.json` → `rules`. The beats:

1. **First two seconds:** what happened, in one short sentence, over the source's headline or a photo of the place or thing.
2. **The one fact** that makes it concrete: the number, the date, the name.
3. **Why it matters:** what changes, and for whom. One or two scenes.
4. **What is not known yet,** if anything important is open.
5. **A question** for the viewer, then the outro line.

## 9. Visuals

`clipping` for the source's headline (capture the page with `shorts capture`), `document` for a quoted line, `stat` and `chart` for numbers, `quote`, `versus`, and licensed photos (`shorts photos`) for places and things. Use the generated explainer clips for how something works. Do not use the product scenes; there is no product. No images of identifiable private people.

## 10. Words that go out with it

Set in `channel.json` → `publish`: the badge names the source (`#042 · via Reuters`), the outro line, the share line, and a credit line that points at the sources in the description. The YouTube description lists the source links automatically. The caption is the event in one line, why it matters, then the question.

## 11. What this channel has learned

*Your own numbers go here once you have them. Until then, the rules above are the starting point.*
