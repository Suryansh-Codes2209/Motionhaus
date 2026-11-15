import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Captions} from './parts/Captions';
import {Footage} from './parts/Footage';
import {Insert} from './parts/Insert';
import {Hook, Slam, Sticker, Warning} from './parts/Overlays';
import {Outro} from './parts/Outro';
import {BehindText, Person} from './parts/Person';
import {Emoji, Flash, Lyric, Sparkles} from './parts/Lyric';
import {inSpans} from './timing';
import type {ReelProps} from './types';

export const Reel: React.FC<ReelProps> = (p) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const bodyEnd = p.outro?.from ?? durationInFrames;
  // camera shake on slams and the warning tape
  const hits = p.overlays.filter((o) => o.type === 'slam' || o.type === 'warning' || o.type === 'behind').map((o) => o.from);
  // beat-drop transitions: zoom kick + blur on the footage under a white flash
  const kicks = p.overlays.filter((o) => o.type === 'flash').map((o) => o.from);
  const behind = (o: (typeof p.overlays)[number]) => o.type === 'behind' || (o.type === 'lyric' && o.behind);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Footage segments={p.segments} video={p.video} zooms={p.zooms} focus={p.focus} hits={hits} kicks={kicks} bodyEnd={bodyEnd}>
        {p.overlays.map((o) =>
          behind(o) ? (
            <Sequence key={o.id} from={o.from} durationInFrames={Math.max(1, o.to - o.from)} layout="none">
              {o.type === 'behind' ? <BehindText o={o} theme={p.theme} /> : null}
              {o.type === 'lyric' ? <Lyric o={o} /> : null}
            </Sequence>
          ) : null,
        )}
        {p.person && frame < bodyEnd ? <Person segments={p.segments} src={p.person.src} theme={p.theme} outline={p.person.outline} pulses={p.person.pulses} /> : null}
      </Footage>

      {p.overlays.filter((o) => !behind(o)).map((o) => (
        <Sequence key={o.id} from={o.from} durationInFrames={Math.max(1, o.to - o.from)} layout="none">
          {o.type === 'hook' ? <Hook o={o} theme={p.theme} /> : null}
          {o.type === 'sticker' ? <Sticker o={o} theme={p.theme} /> : null}
          {o.type === 'slam' ? <Slam o={o} theme={p.theme} /> : null}
          {o.type === 'warning' ? <Warning o={o} theme={p.theme} /> : null}
          {o.type === 'insert' ? <Insert o={o} theme={p.theme} /> : null}
          {o.type === 'lyric' ? <Lyric o={o} /> : null}
          {o.type === 'sparkle' ? <Sparkles o={o} /> : null}
          {o.type === 'emoji' ? <Emoji o={o} /> : null}
          {o.type === 'flash' ? <Flash /> : null}
        </Sequence>
      ))}

      {frame < bodyEnd && !inSpans(frame, p.hideCaptions) ? <Captions pages={p.captions} theme={p.theme} y={p.captionY} look={p.captionStyle} /> : null}

      {p.outro ? (
        <Sequence from={p.outro.from} durationInFrames={p.outro.dur}>
          <Outro {...p.outro} handle={p.handle} theme={p.theme} />
        </Sequence>
      ) : null}

      {p.music ? (
        <Audio
          src={staticFile(p.music.src)}
          volume={(f) => p.music!.volume * interpolate(f, [0, 12, durationInFrames - 20, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      ) : null}
      {p.sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, s.frame)} layout="none">
          <Audio src={staticFile(`audio/sfx/${s.name}.wav`)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
