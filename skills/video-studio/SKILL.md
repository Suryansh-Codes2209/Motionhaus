---
name: video-studio
description: Use when making a channel's video end to end with a crew of subagents (research, script, photos, sound, edit, QA), when the user asks for a "catchy", "high-level edit", "properly edited" or "trending" video, wants a video researched and made in one go, or complains that an edit is boring, under-edited, or has vague effects or sound.
---

# Video studio: a crew of subagents per video

One video is six jobs. Each goes to its own subagent, so every job gets a full context window and its own checks. You are the **director**. You write the briefs, read what comes back, decide, and keep the episode folder consistent. Subagents never talk to each other; everything passes through files in the episode folder and through you.

```
1 Researcher ──► research.md
2 Writer ──────► script.json (draft: VO, chapters, scene plan with photo/sfx slots) + metadata.json
3 Photo editor ┐ photos/ + photo-plan.json        (3 and 4 run in parallel)
4 Sound designer┘ sound-plan.json
5 Editor ──────► script.json (final: photos, broll, fx, transitions) + stills, reviewed
6 QA ──────────► qa.md (claims, stills, earshot) → fixes → final render
```

The episode folder is `workspace/channels/<channel>/long/<slug>/` (long-form) or `workspace/channels/<channel>/episodes/<slug>/` (short). Create it, and run `shorts sfx-kit` once, before step 1.


**Craft rules live in `skills/video-craft`** (story, motion, continuity and cuts, look, sound, captions, review, 3D depth, a pool of 40 designs). Read its table and house decisions before writing a script or reviewing a render.

## How to brief a subagent

Use the Agent tool. Each brief contains the goal; the episode folder's absolute path; the files to read first (always the skill reference named below, plus the outputs of earlier steps); the exact output file and its shape; and the checks the subagent must run before it returns. Ask for a summary of under 150 words, because the files carry the detail. Run 3 and 4 in the **same message** so they run in parallel. Read every output file yourself before the next step: you approve, the crew proposes.

## 1. Researcher → `research.md`

**Brief:** find the story and source every fact.
- Read the channel's brief first (`brief.md`; `skills/channel-brief`): "Where stories come from" and "What makes a story worth covering" say where to look and what to skip. Run `shorts run` when the channel has feeds, and search inside the brief when it allows. Prefer stories that have a real mechanism, something to show and a tension. Claim the story with `shorts story claim` before anything is written.
- Read the primary sources the brief's "Sources of truth" names (the post, the README, the filing, the paper, the official statement), not summaries of them. Fetch them into the folder (`source-*.md`).
- Output: the angle in one line; 10–20 facts, each with its source URL and date; 3–5 verbatim quotes with the speaker; numbers; the open questions; and 10 **photo subjects** (plain objects, places, people: "padlock", "data center", "Linus Torvalds").

## 2. Writer → `script.json` draft + `metadata.json`

**Read:** `research.md`, `skills/long-form/SKILL.md` (or `skills/short-styles/SKILL.md` for a short), and the chosen style's reference.

**Brief:** write the script against the structure and retention rules. Every scene carries `vo`, and a `"plan"` note (removed later) saying what the picture should be: `"plan": "photo montage: padlocks, chains"`, `"plan": "crack scene"`. Rules:
- Objects over text boxes (`crack`, `photo`, `clip`, `spotlight`, `code`); `flow` only for a true multi-step pipeline.
- **Real photos at the retention points:** the first 10 s, about 30 s, about 60 s, about 90 s and the verdict (long-form); the hook (short).
- Third person; numbers as words in `vo`; every claim in `sources`.

## 3. Photo editor → `public/photos/` + `photo-plan.json`

**Read:** `script.json` (the `plan` notes), `research.md` (photo subjects), `skills/long-form/SKILL.md` → Real photos.

**Brief:** for each photo slot, fetch candidates with `shorts photos <dir> "<subject>" --n 4 --orient wide` (Openverse + Wikimedia Commons, CC0/PD/CC BY/BY-SA only). **Look at every image** (Read the file) and drop the blurry, off-topic, watermarked and private ones. Pick 4–8 photos for each montage and 1 for each single shot. Output `photo-plan.json`: `{"<scene index>": {"images": [...], "credit": "Photo: … / CC BY", "focus": {"x":…,"y":…}}}`, plus a contact sheet `out/photos-sheet.png` (ffmpeg xstack) for the director. Aim for **20–40 photos in a long-form**. Never use Pinterest, Google Images or social media posts.

## 4. Sound designer → `sound-plan.json`

**Read:** `script.json`, `skills/short-styles/references/sound.md`, `skills/short-styles/references/fx-catalog.md`; run `shorts sfx-kit` and read its table.

**Brief:** give every scene its sound event, so that no cut, hit or photo change is silent:
- Pick transitions by their sound: `glitch` crackles, `filmBurn` ignites, `iris` sounds a shutter, everything else whooshes.
- Choose `glitchAt` beats on the words that earn a glitch (a hack, a failure, "broken"), not on a timer.
- Scene sounds come from the kit roles: glitch, shutter, stamp, unlock, fire, static, typing, drop, alarm, error, impact, riser, pop, tick.
- Missing sounds: the kit pulls real recordings from Openverse (when it answers) and the uisfx CC0 pack (`assets/audio-packs/uisfx-*`), then the earshot bank. Add a role to `ROLES` in `packages/audio-lib/src/sfxkit.mjs` only if none fits, and rebuild with `shorts sfx-kit --rebuild`.
- Output: `{"<scene index>": {"transition": "…", "glitchAt": [...], "notes": "…"}}`.

## 5. Editor → final `script.json`, stills reviewed

**Read:** all of the above and `fx-catalog.md`.

**Brief:** merge the plans into `script.json`, remove the `plan` notes, and edit for energy:
- **Something new on screen every 2–3 s.** That can be a photo cut, a zoom, a glitch hit, an element landing or a transition. A scene longer than 6 s needs a montage, `broll`, a busy scene (`crack`, `code`, `clip`) or a camera move.
- Photo montages: `{"type": "photo", "images": [6 photos], "mode": "montage", "every": 1}` hard-cuts one photo per beat, each with a shutter and a flash. `"broll": [4–6 photos]` on a `hook`/`stat`/`quote`/`type` puts changing real photos behind the text.
- Use effects where the VO earns them (taste rules in fx-catalog): 6–10 per long-form, at most one `fx` per scene, `flames` at most once.
- Run `shorts make <dir> --fast --stills <one frame per scene, ~60% into each>` and **Read every still**. Fix overlaps, unreadable text, crops and empty frames, then re-check.

## 6. QA → `qa.md`, then fix and render

**Brief (a fresh subagent, which has seen none of the above):**
1. Check every claim in `vo`, every quote and every number against `research.md` and the sources. List each one that doesn't match exactly.
2. Read the stills. List unreadable text, crops, overlaps with the badge or chapter chip, and repeated or off-topic photos.
3. After a `--render`, run `shorts critique <dir>` (earshot) and paste its critical and major fixes.
4. Check the length (long-form 1:50–2:30; short 20–25 s) and the loudness (about -14 LUFS).

The director fixes what QA lists, re-runs the stills, then runs `shorts make <dir> --render`, `shorts critique <dir>` and `shorts kit <dir>`.

## Director's checklist before handing over

- [ ] Every fact has a source; the photo and SFX credits are in the description (automatic for the photos and sounds actually used).
- [ ] The first frame shows a real image or the product; nothing static for more than 3 s.
- [ ] Every transition, glitch hit and photo cut has its sound; the earshot critique has no critical lines.
- [ ] The thumbnails have 3 different layouts and the photo layout reads at 320 px.
