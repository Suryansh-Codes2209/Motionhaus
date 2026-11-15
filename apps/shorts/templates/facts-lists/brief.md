# Channel brief: facts and lists

Fill in the parts in *italics*, then delete this line. The numbers that the checks enforce live in `channel.json` (`rules`, `publish`); this brief explains the choices and tells the maker how to work.

## 1. What this channel covers

One surprising, true thing per video, or a short list of them, about *your subject: animals, history, space, the human body, cricket records, your country*. It does not cover *what is outside your subject*, current news, or "facts" that are really opinions.

## 2. Who watches

*Who they are: for example curious people killing a minute who like to be surprised. What should make them send it to a friend.*

## 3. Voice and point of view

Warm, quick and exact. The surprise comes from the fact, not from shouting.

- Say the fact first, then earn it.
- Use "about" and "roughly" when the source does.
- No "scientists say" without naming who.

## 4. Where stories come from

Search inside *your subject* for facts that are surprising and well documented: reference works, museum and agency pages, review papers. Before writing, claim the story with `shorts story claim`. The key names the fact (`octopus-three-hearts`), so the channel never tells the same one twice.

## 5. What makes a story worth covering

- A viewer's first reaction is "no way", and the second is "oh, that's why".
- A reference-quality source states it plainly.
- It can be shown: a photo, a number, a comparison.
- Skip: the fact everyone already knows, the "fact" that is a famous myth (check; many are), anything true only with three caveats.

## 6. Sources of truth

A claim may rest on a reference work, a museum, agency or university page, or a published paper or its review. Prefer the source closest to the measurement.

Never enough: a listicle, a social post, another fact video, an AI summary, a quote site.

Every claim is listed in `script.json` → `sources` with its link; the check fails without one. Before the final render, reopen each link and read the line it supports against the page. If the page hedges, the line hedges. If the page does not say it, cut the line.

## 7. Never

- Health or diet claims that tell a viewer what to do.
- A superlative ("the only", "the largest") the source does not make.
- A myth presented as fact, or a fact about a people or a religion that turns on a stereotype.
- A number without its unit and, where it changes, its date.

## 8. Shape of an episode

Length and scene count are set in `channel.json` → `rules`. The beats:

1. **First two seconds:** the fact itself, short, over a picture of the thing.
2. **The number or detail** that makes it concrete.
3. **Why it is so:** the mechanism, in plain words. One or two scenes.
4. **One more turn:** a second, related surprise.
5. **A question** for the viewer, then the outro line.

For a list ("three animals that…"), one scene per item and no more than three or four items.

## 9. Visuals

Licensed photos (`shorts photos`, with the subject cut out for text-behind-subject where it helps), `stat`, `tiles`, `stack`, `versus`, `chart`, and the generated explainer clips for mechanisms. Photo credits are added to the description automatically. Do not use the product scenes.

## 10. Words that go out with it

Set in `channel.json` → `publish`: a badge with only the number (`#042`), the outro line, the share line, and a credit line that points at the sources in the description. The YouTube description lists the source links automatically. The caption is the fact, one line of why, then the question.

## 11. What this channel has learned

*Your own numbers go here once you have them. Until then, the rules above are the starting point.*
