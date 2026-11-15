# Sound

An edit that looks pro but plays synthesized beeps reads as a silent movie. Every style uses the same sound rules.

**Real recordings, not synths.** `shorts make` (and `reels render`) copy the shared SFX kit into `public/audio/sfx/`: real CC0 / CC-BY takes from Openverse (and Freesound with a key) for whoosh, impact, riser, pop and tick, trimmed around their peak, level-matched per role, 48 kHz stereo. It is built once into `workspace/shorts/cache/sfx-kit/` and reused; `npm run shorts -- sfx-kit` shows it, `--rebuild` re-picks. A role with nothing usable (offline) falls back to the ffmpeg synth for that role only. CC-BY takes are credited in `<episode>/sfx-credits.txt`, which `shorts kit` / `publish` append to the description. Don't ship a reel without pasting it into the caption.

**On the event frame.** A sound belongs to something on screen: `<Sfx name at>` goes on the frame the card lands, the line types, the number slams. Never on a timer, never "near" it.

**Peak, not file start.** `at` is the event frame; the kit's measured `peakMs` (`kit.json`, passed in `config.sfxKit`) moves the file so its peak lands there. Taps and pops lead nothing: the transient is the frame. Whoosh peaks land 2 frames *after* the cut (`WHOOSH_LAG_FRAMES`); the riser peaks on the logo reveal. Don't hand-tune lead-ins like `at={enter - 4}`.

**No machine-gun repeats.** In a run (cards, steps, log lines, typed words) pass the item's index: `<Sfx name="pop" at={at} i={i} />`. The kit rotates its takes (`pop-1..3`, `tick-1..3`, `impact-1..3`) so the same file never plays twice in a row. Without `i`, or without a kit, the base name plays.

**Listen before shipping.** If `earshot` is installed, `npm run shorts -- critique <dir>` (reels: `npm run reels -- critique <dir>`) scores the mix against pro launch films and lists timestamped fixes (cuts with no sound, synth-sounding SFX, late whooshes). Fix the `critical` and `major` lines. Loudness is already handled (-14 LUFS); don't touch the loudnorm step.
