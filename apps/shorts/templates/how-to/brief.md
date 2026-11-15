# Channel brief: how-to tips

Fill in the parts in *italics*, then delete this line. The numbers that the checks enforce live in `channel.json` (`rules`, `publish`); this brief explains the choices and tells the maker how to work.

## 1. What this channel covers

One thing the viewer can do right after watching: *your subject, for example spreadsheet tricks, phone settings, kitchen basics, study methods, a programming language*. It does not cover *what is outside your subject*, product reviews, or anything that needs more than a minute to explain safely.

## 2. Who watches

*Who they are and what they are trying to get done. What "it worked" looks like for them.*

## 3. Voice and point of view

Direct and friendly, in the second person: "open Settings", "press and hold".

- Name the exact button, menu or amount.
- Say what the viewer will see when it worked.
- One way to do it, the simplest that is correct.

## 4. Where stories come from

Search inside *your subject* for a tip that is useful, not widely known, and documented by the maker of the tool or by a recognised reference. Before writing, claim the story with `shorts story claim`. The key names the tip (`excel-flash-fill`), so the channel never repeats one.

## 5. What makes a story worth covering

- It saves real time or fixes a real annoyance.
- It works on the current version of the thing, for most people.
- It fits in three or four steps.
- Skip: a tip that needs a paid add-on, one that is in every tutorial already, anything that can lose the viewer's data if done slightly wrong.

## 6. Sources of truth

A claim may rest on the official documentation or help page of the tool, the maker's own guide, or a recognised reference for the craft. Where you can, do the steps yourself and say which version you used.

Never enough: a forum answer on its own, another tip video, an AI summary.

Every claim is listed in `script.json` → `sources` with its link; the check fails without one. Before the final render, reopen each link and read each step against the page. If a step differs from the documentation, follow the documentation.

## 7. Never

- Medical, legal or financial instructions; anything involving mains electricity, gas, medication or dieting.
- Steps that bypass a paywall, a licence or a safety feature.
- A step you could not confirm in the documentation.
- "This always works." Say which version and device.

## 8. Shape of an episode

Length and scene count are set in `channel.json` → `rules`. The beats:

1. **First two seconds:** the result, shown, with the promise in a few words ("merge two columns without a formula").
2. **Where to go:** the app, screen or tool.
3. **The steps,** one scene each, at most four.
4. **What it looks like when it worked.**
5. **The action:** tell the viewer to try it now, then the outro line. This template does not require a closing question.

## 9. Visuals

`steps` and `flow` for the sequence, `type` for the exact text to enter, `code` for commands, captures of the official page or the screen (`shorts capture`) shown with `clipping`, and licensed photos for physical tasks. Do not use the product scenes unless the tip is about one app and you set its page as `brand.url`.

## 10. Words that go out with it

Set in `channel.json` → `publish`: a badge with only the number (`#042`), the outro line, the share line, and a credit line that points at the sources in the description. The YouTube description lists the source links automatically. The caption is the promise, the steps in one line each, and which version it was tested on.

## 11. What this channel has learned

*Your own numbers go here once you have them. Until then, the rules above are the starting point.*
