# Channel brief: product launches

Fill in the parts in *italics*, then delete this line. The numbers that the checks enforce live in `channel.json` (`rules`, `publish`); this brief explains the choices and tells the maker how to work.

## 1. What this channel covers

New products, tools and projects in the days after they launch: *your slice, for example AI tools, developer tools, games, design tools, open-source projects*. One launch per video. It does not cover *what is outside your slice*, rumours about unreleased products, or funding news.

## 2. Who watches

*Who they are and what they want from thirty seconds: for example developers who want to know what is worth trying this week.*

## 3. Voice and point of view

The channel covers launches. It is never the product's own advert.

- Narrate in the third person. Say "the developer", "the team" or "they"; a post or a README does not tell you anyone's pronouns.
- Never "we" or "our" about the product.
- The series badge stays on screen from the second scene, so a viewer can tell this is coverage.
- Say what it does and what is surprising about it. Do not sell it.

## 4. Where stories come from

`shorts run` fetches the feeds in `channel.json` (`stories.feeds`: Hacker News "Show HN" and new GitHub repositories by default) and prints a shortlist. Pick from it. You may also search for launches in *your slice* that the feeds miss. Either way, claim the story with `shorts story claim` before writing.

## 5. What makes a story worth covering

- The thing works today and a viewer can try it.
- There is something you can show: a page, a demo, a clip of it running.
- The title can honestly lead with a name people already search for (`channel.json` → `anchors`), followed by the surprising part. Skip a launch nobody would search for unless it anchors honestly ("X, rebuilt for Linux").
- Skip: a landing page with a waitlist and nothing to show, a clone with no twist, anything whose page is mostly a cookie wall.

## 6. Sources of truth

A claim may rest on the product's own page, its repository and README, and the maker's launch post. Numbers (stars, downloads, prices) are quoted as they stood when you read them. A quote, a forum comment or a log line shown on screen is verbatim from the real source, with "…" for cuts, and a comment's author is the real handle.

Never enough: a social post about the product by someone else, a number you cannot find on the page, an AI summary.

Record what each claim rests on in `script.json` → `sources`.

## 7. Never

- Pose as the product or imply a partnership.
- Feature a site on `blocklist.txt` or a topic in `stories.banned`.
- Use the product's logo or name in a way that suggests the channel made it.
- State a capability the page does not show.
- Cover the same product twice. `shorts story claim` refuses it.

## 8. Shape of an episode

Length and scene count are set in `channel.json` → `rules`. The beats:

1. **First two seconds:** the thing working, on screen, with the surprising part in a few words over it. The first spoken sentence is short and leads with the name or the pain it removes. No logo, no title card.
2. **What it is,** in one line.
3. **Two details that make a viewer say "wait, really?"**, one scene each. Show them.
4. **A question** worded so the opening answers it when the short loops.
5. **The outro line** from `publish.outro`, kept short.

Frame an internal detail as the payoff ("finds its data after a crash in 0.1 s"), not as the topic ("how it works").

## 9. Visuals

Capture the product's site into `public/site/` and use `screenshot`, `spotlight`, `features`, `stat`, `chat`, `code`. Choose a bright capture for frame 0: it is the thumbnail in the Shorts list. A licensed photo can serve as the hook when the capture is weak.

## 10. Words that go out with it

Set in `channel.json` → `publish`: the badge (`#042 · via GitHub`), the outro line, the Instagram share line, and the credit line that says the channel is not affiliated. The caption is the claim again, what the product is with its link, then the question. The pinned YouTube comment starts with a question that takes a side, with the links under it. Tag the maker on Instagram only when you have looked up their real handle.

## 11. What this channel has learned

*Your own numbers go here once you have them: which videos held viewers, which titles were found in search, what your Instagram audit showed. Until then, the rules above are the starting point. Do not judge the channel before 40 to 50 videos.*
