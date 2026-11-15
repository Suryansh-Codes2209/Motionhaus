# Motionhaus architecture

Motionhaus is one repo that is also one Claude Code plugin. Code is split into **packages** (reusable building blocks), **apps** (things that produce videos on a schedule) and **skills** (how Claude drives them). Everything the code generates goes to `workspace/`, which is gitignored.

```
motionhaus/
  .claude-plugin/        plugin + marketplace manifest (name: motionhaus)
  .mcp.json              audio-library MCP server → packages/audio-lib
  skills/
    launch-video/        LaunchReel: URL → launch film (scaffolds a project from packages/motion-kit)
    launch-references/   research real launch videos → video brief
    short-styles/        edit styles: which look a video gets, and how to write for it
    insta-reels/         edit real footage into an Instagram Reel (edit.json → reels app)
    motion-engines/      art styles, explainer clips, GSAP, Anime.js, Three/R3F, Rive, Motion Canvas, Satori
  packages/
    motion-kit/          Remotion src/ + scripts/ (capture.mjs, make-audio.sh). Not an npm package:
                         it is copied into each launch-film project and synced into the shorts studio.
    audio-lib/           @motionhaus/audio-lib: music/SFX providers, licenses, references, MCP server
    film-qa/             @motionhaus/film-qa: pre-delivery gate + reference breakdown for any MP4
                         (ported from huashu-art-motion, MIT)
    art-engine/          vendored huashu-art-motion canvas engine (MIT): 35+17 art styles, 8 explainer grammars.
                         Browser JS, driven frame-by-frame from Remotion (studio engines/Huashu.tsx)
  apps/
    shorts/              @motionhaus/shorts: Launch Radar pipeline (fetch → pick → script → voice → render → kit/publish)
      studio/            the persistent Remotion project for shorts (own lockfile, exact Remotion versions)
      brand/ series.json blocklist.txt sample/
    reels/               @motionhaus/reels: phone footage → reel (prep → edit.json → render → QA)
      studio/            Remotion project for reels (own lockfile) + src/engines/ (all motion engines) + Lab compositions
  references/ assets/    data read by audio-lib (curated videos, channels, local audio packs)
  docs/                  specs/, channel/, this file
  workspace/             GENERATED, gitignored. Override the location with MOTIONHAUS_DATA.
    launch-films/<site>-launch/
    channels.json                      {"default": "<channel>"}
    channels/<channel>/                one folder per channel: channel.json (name, handles, look, voice, slots),
                                       brand/, blocklist.txt, episodes/, long/, runs/,
                                       review/{youtube-shorts,youtube-long,instagram-reels}, ledger.json,
                                       autopilot.log, autopilot-state.json, maker-runs/
    shorts/cache/                      tooling shared by every channel (models, voice env, SFX kit): never per channel
    reels/<slug>/{public/source.mp4, analysis.json, edit.json, props.json, out/reel.mp4}
    cache/               audio-lib + references caches (dev checkout)
```

## Data flow

```
packages/motion-kit ──sync──▶ apps/shorts/studio/src      (npm run sync; never touches src/shorts/, src/longform/, Root.tsx, video.config.ts)
packages/motion-kit ──copy──▶ workspace/launch-films/<x>/  (launch-video skill, step 1)

apps/shorts CLI (two YouTube formats, picked by script.json "format"):
  fetch/pick ─▶ workspace/channels/<channel>/runs/<date>/
  YouTube Shorts: script.json (skills/short-styles) ─▶ workspace/channels/<channel>/episodes/<slug>/
    make ─▶ voice + captions + props.json + music + .srt ─▶ "Short" 9:16 ─▶ out/short.mp4
    kit  ─▶ workspace/channels/<channel>/review/youtube-shorts/<nnn-slug>/
  YouTube long: script.json "format": "long" (skills/long-form) ─▶ workspace/channels/<channel>/long/<slug>/
    make ─▶ voice + props.json + music + .srt + chapters ─▶ "Long" 16:9 ─▶ out/long.mp4, thumb-N.png, description.txt
    kit  ─▶ workspace/channels/<channel>/review/youtube-long/<nnn-slug>/
  publish ─▶ upload + .srt track (+ thumbnail for long)
  insta-post ─▶ the reel due today in review/instagram-reels/schedule.json ─▶ film-qa gate ─▶ Instagram Graph API
               (resumable upload from disk) ─▶ `posted` written back to schedule.json + ledger.json
  autopilot  ─▶ two launchd agents per channel (com.motionhaus.<channel>.poster|maker): poster (insta-post every 15 min from the slot) and maker
               (headless Claude: run ─▶ script ─▶ make --render ─▶ gate ─▶ kit, once a day while < 3 days are queued)
```

reels CLI:
  prep ─▶ conform (1080x1920 CFR) + whisper words + pauses ─▶ workspace/reels/<slug>/
  edit.json (Claude, following skills/insta-reels) ─▶ render ─▶ props.json ─▶ remotion (reels studio)
       ─▶ loudnorm -14 LUFS ─▶ out/reel.mp4 ─▶ film-qa gate (reel profile)

## Conventions
- Remotion motion is always frame-driven (`useCurrentFrame` + `spring`/`interpolate`). Never use CSS animation, Tailwind or framer-motion, because they don't render. Effects ported from 21st.dev live in `packages/motion-kit/src/components/fx/`, each with a credit header.
- Edit the motion kit in `packages/motion-kit`, never in the studio copy, then `npm run sync`.
- `npm run check` at the root typechecks and tests every package and the studio.
- A channel's subject is not in the code: `brief.md` (prose, read by whoever writes the episode) and three blocks in `channel.json` that the pipeline enforces, resolved with defaults by `apps/shorts/src/channel-settings.mjs`: `stories` (feeds, identity rule, banned topics), `rules` (which `shorts make` checks apply) and `publish` (badge, outro, credit lines, YouTube category). Templates live in `apps/shorts/templates/`. Story identity and 24-hour claims are in `apps/shorts/src/stories.mjs`.
- A channel is a folder, not code: `shorts channel new <slug>` creates `workspace/channels/<slug>/` from the defaults in `apps/shorts/` (`series.json`, `brand/`, `blocklist.txt`). Every `shorts` command acts on one channel (`--channel <slug>`, else `MOTIONHAUS_CHANNEL`, else the default) and never guesses. A channel's logins live outside the repo and the workspace, in `~/.config/motionhaus/channels/<slug>.env`, and are never read from the shared `.env`. See `apps/shorts/src/channels.mjs`.
- Every delivered video goes through `npm run qa -- gate <mp4> [--profile animation|reel]` (exit 2 = red). Reference videos can be mapped with `npm run qa -- breakdown <mp4> --out <dir>`.
