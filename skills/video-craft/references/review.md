Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), skills/hyperframes/SKILL.md (work loop), references/review.md, spec.md, film.md, storyboard.md.

# Review

You wrote the timeline, so you know what happens. The viewer sees it once, at full speed, often on a phone. Review is how you see the film as they will: as a harsh motion director, not a proud author. Lint and `shorts make` warnings catch what is broken; this pass catches what is weak.

## 1. The work loop

1. **Existing video:** list what plays when, and check what the user changed since your last turn. Build on their edits.
2. **New film over ~15 s:** read the type's needs (`story.md` §9) → write three storylines in words only, one gets picked (`story.md` §2) → write the spec with every adjective as a number, the defaults banned by name, the shots by frame (`look.md` §3) → optional storyboard stills for approval (`story.md` §10).
3. **Build.** Up to about six short scenes, build them yourself in one context (about 9 min for five, against about 21 min split across sub-agents). Beyond that, give each worker two or three scenes and start them all at once; a second wave nearly doubles the time.
4. **After the last edit:** run the mechanical checks; fix every error, weigh every warning. A warning is a question, not a rule: fix it, or keep it on purpose and say why in the note.
5. **A film:** the full review below, ending in a delivery note. **A small edit:** render stills of only what you changed and look before you reply.
6. **Render the final** only after checks and review pass and the user approved the preview, asked for the file, or asked for no stops. Otherwise stop at the preview and wait.

Run the review on every new film and on any edit that changes timing or layout.

## 2. Measure, then look

Trust the numbers over your eye where they disagree: a clipped label or a 0.6 s line looks fine on a contact sheet.

**Measurable craft warnings** (compute them; don't eyeball):

| Warning | Threshold |
|---|---|
| Line unread | on screen for less than 0.5 s + 0.3 s per word |
| Dead stretch | more than 3 s with nothing changing (a deliberate hold must be marked as one) |
| Text below floor | under 2.6% of the frame's short side (28 px at 1080) |
| First frame empty | frame 0 is blank or near-black (it is the thumbnail) |
| Film silent | over 15 s with no sound |
| Late / out of order / off frame / frozen | an element appears after its planned time, before its predecessor, leaves the frame, or a scene stops moving |

Conflict: HyperFrames flags any stretch over 3 s with nothing changing. Motionhaus `long-form` asks for something new every 6–10 s (shorts: about every 3 s).

**Three contact sheets** (open all three):

1. **Beats:** each scene just after it starts and at its middle, plus each named beat.
2. **Cuts:** a strip across every cut, from −0.2 s to +0.2 s.
3. **Phone:** the beat frames at 360 px wide.

Then:

- Motion between the beats: 8 frames across the hero move and across the payoff; a path plot for any move that must arc or land.
- Against a reference video: the same timestamps side by side.
- The rendered file's audio: present, hits where the picture hits, loudness in range (`sound.md` §6). You cannot hear it; say so.

Motionhaus today renders one still per scene at its settled moment (`--stills`). The cut strip, the scene-start frame and the 360 px sheet are additions.

## 3. What to look for

First:

1. Describe each beat frame in one sentence **as a stranger would, naming every object.** An object you would have to explain ("those bars are mirrors") is a P0.
2. Read the beat frames in order: do they tell a story a stranger follows, each one causing the next?
3. Compare each frame with its shot in the spec. What does not match is a note.
4. Name every default the frames show (`look.md` §5, or one not on the list yet), add each to the film's BANNED line, and fix them before anything else.

Then go through the sheets once per question:

| Question | What it catches |
|---|---|
| Does it read as what it is? | a shape that reads as another object, a material that reads as plastic, a product screen that reads as a mockup, a face or mascot that reads wrong |
| Does the subject separate? | subject and ground too close in value, two focal points in one frame, the eye with nowhere to go |
| Framing and contact | crops, text at the edge or under platform UI, collisions at a seam, things floating that should touch |
| Timing as a first-time viewer | a read shorter than its words, something that pops on with no move, a jump at a cut, everything moving at once on one curve |
| Tells | which items of `story.md` §8, `motion.md` §2 (generated defaults) and each type's tells are on screen |
| The pictures alone | with the words covered, do the beat frames still tell the storyline? |
| The words alone | read only the lines: does a stranger get the pitch? |
| The phone sheet | can every line meant to be read be read at 360 px? |

Checks specific to parts of a film:

- **Transitions:** review intermediate frames as well as endpoints; carried labels and values must not jump or get covered on the way.
- **Palette change:** check frames from every affected scene and transition; a later colour animation can restore the old ground.
- **3D:** stills of the dive and the payoff; time the heaviest frame once.
- **Frame craft bar:** squint (one element 3–6× its neighbour), silence (45–60% empty on statement frames), restraint, anchor variety, no invented figures (`look.md` §4).
- **Captions:** one group at a time, nothing stale, nothing over the face (`captions.md`).

## 4. Notes and fixes

One line per problem:

`t=4.2s · where · problem → exact change · what stays`

| Rank | Meaning |
|---|---|
| **P0** | breaks the read or the rules: unreadable, wrong, broken, a tell in the hero shot |
| **P1** | weakens the film: a dead stretch, a soft payoff, a seam that jumps |
| **P2** | polish |

- Fix every P0 and the P1s worth their time, in this order: **text, then timing, then detail.**
- Then re-render stills of only what you changed, once. A second full pass only when a P0 is still open.
- **Never score the film out of 10**: a score finds nothing to fix.
- When a fix does not hold: take the frames on either side of the problem, list every difference, and change only the line that causes it.
- A film that feels busy: remove a third of the motion and keep the moves that lead the eye.
- **Fresh eyes:** give a sub-agent only the storyboard / plan and the three sheets, ask for P0 and P1 lines in the format above, and keep the editing to yourself.
- Commit or copy the project before fixing, so a fix that makes things worse can be rolled back.

Conflict: HyperFrames says never score a film. Motionhaus `shorts critique` (earshot) scores the mix against pro launch films, and `film-qa gate` passes or fails a render; both also list timestamped fixes.

Conflict: HyperFrames stops at the preview until the user approves. Motionhaus `launch-video` renders the final MP4 in the same run.

## 5. The delivery note

Write it next to the film (e.g. `REVIEW.md` in the episode folder) and put its short form in the reply. The next turn reads it before changing anything.

- the creative calls you made, and the storylines you did not build;
- what you measured and what you only looked at; what nobody checked (the sound was measured, not heard);
- the weakest shot, and what you would change with more time;
- warnings you kept on purpose, and why.

## 6. Quick checklist

- [ ] One thing, one viewer, one real task; every claim sourced
- [ ] Frame 0 is not black, not a logo; the hook reads muted
- [ ] Every read line holds 0.5 s + 0.3 s per word; last line ≥ 2 s
- [ ] No text under 28 px at 1080; readable at 360 px wide
- [ ] Hero fills ≥ 40% of the frame; one hero move per shot
- [ ] No stretch over 3 s with nothing changing, unless held on purpose
- [ ] Landed titles are still; entrances vary; exits shorter than entrances
- [ ] Every transition has a cause; cut strips show no jump
- [ ] Each sound has a cause on screen; peaks aligned; loudness −16 to −14 LUFS
- [ ] Every default on screen named and added to BANNED
- [ ] Delivery note written
