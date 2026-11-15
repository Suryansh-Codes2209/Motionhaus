---
name: channel-brief
description: Use when making an episode for any channel (read its brief first), when starting a new channel or writing its brief.md, when choosing a template (launches, news-explainer, facts-lists, how-to), or when a channel's rules, sources or "what it covers" are in question.
---

# The channel brief

A channel is a folder: `workspace/channels/<slug>/`. Two files say what it is.

| File | Holds | Who reads it |
|---|---|---|
| `brief.md` | what the channel covers, who watches, the voice, where stories come from, what counts as a source, what is off limits, the shape of an episode, what the channel has learned | you, before every episode |
| `channel.json` | name, handles, look, voice, slots, and three blocks the code enforces: `stories`, `rules`, `publish` | the pipeline (`shorts make`, `kit`, `story claim`) |

The brief is prose and nothing in the code parses it. The numbers the checks enforce (scene and word bounds, which checks apply, the outro line, the credit line) live in `channel.json`; the brief explains them. When the brief and a shared skill disagree, the brief wins. When the brief and `channel.json` disagree, say so and stop: the owner has to fix one of them.

## Making an episode

1. **Read `brief.md` end to end.** Sections 1, 5, 6 and 7 decide the story: what the channel covers, what is worth covering, what a claim may rest on, and what it never does.
2. **Find a story.** `shorts run` when the channel has feeds (`channel.json` → `stories.feeds`); search inside the brief when `stories.search` is on. Sections 4 and 5 say where to look and what to skip.
3. **Claim it before writing:** `shorts story claim --title "…" --url <main source> --key <short-name> [--source "where it was found"]`. It refuses a story the channel has covered, a banned topic or a blocked site, and prints the episode number. The claim holds for 24 hours and the same key returns the same number, so a retry resumes its own story. Put `episode` and `key` in `script.json`. On a product channel, `--title` is the product's name and `--url` is the product's own page, not the forum thread where it was found (that goes in `--source`); a different product that only shares a name can be claimed with `--allow-same-name`. A story dropped after claiming it (its sources do not hold up) is given back with `shorts story release --key <short-name>`.
4. **Research from the sources section 6 allows.** Fetch them into the episode folder. Write `sources` in `script.json`: `{"<claim>": "<where it comes from, with link and date>"}`, one entry for every factual line.
5. **Write, make, check** as `skills/short-styles` describes. The `retention:` and `instagram:` lines from `shorts make` are the channel's own rules.
6. **Reopen every link and read the line it supports against the page**, before the final render. The check can only see that a link is there; whether the page says what the video says is this step. If the page hedges, the line hedges. If the page does not say it, cut the line.
7. **`shorts kit`** when everything is green.

## Starting a channel

`shorts channel new <slug> --name "…" --template <launches|news-explainer|facts-lists|how-to>` copies a template: a `channel.json` with every rule and published line spelled out, and a `brief.md` with the eleven headings and the parts to fill in marked in italics.

| Template | For | "Same story" means | Sources required |
|---|---|---|---|
| `launches` | new products and projects | the same product (link, site or name) | no (the product's own page) |
| `news-explainer` | one event, explained | the same link or key; a close headline warns | yes |
| `facts-lists` | one surprising true thing | the same link or key | yes |
| `how-to` | one thing to do | the same link or key | yes |

Writing the brief:

- Section 1 is the hard one. Name the slice and name what is outside it; "tech news" is not a channel, "AI tools a solo developer can run today" is.
- Section 6: name the kinds of page a claim may rest on, and the kinds that are never enough. Be stricter the more a wrong claim could hurt someone.
- Section 7: write the things this channel must never do as plain refusals. For anything touching health, money or law: no advice, no predictions.
- Section 11 starts empty. It fills with the owner's own numbers and lessons, and those stay in this channel's folder, never in a shared skill or template.
- Then set the handles, hashtags, colours and voice in `channel.json`, and for `launches` the `anchors` (names people already search for); for `news-explainer` add feeds as `{"type": "rss", "url": "…", "label": "…"}`.

An existing channel made before briefs existed is brought up to date with `shorts channel upgrade` (it changes nothing about how the channel behaves).

## Common mistakes

- Writing before claiming: two runs then make the same story, or reuse a number.
- A `sources` entry with no link, or a link to a page that does not contain the claim.
- Using a product scene (`screenshot`, `spotlight`, `chat`, `cta`) for a subject with no page of its own. Use `clipping` (capture the page with `shorts capture`), `photo`, `stat`, `chart`, `document`.
- Treating a template's rules as tuned. They are a starting point; the owner tunes them from the channel's own numbers.
- Putting one channel's numbers or handles into a shared skill or a template.
