import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {displayFamily} from '../fonts';
import type {BehindOverlay, Segment, Span, Theme} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// The speaker cut out of the frame (person.webm, alpha from `reels mask`),
// drawn over the footage inside the same camera move. Anything rendered
// before it sits *behind* the person; `outline` spans give the cutout a white
// sticker stroke and a glow that kick on each pulse (line starts, zooms).
export const Person: React.FC<{segments: Segment[]; src: string; theme: Theme; outline: Span[]; pulses: number[]}> = ({segments, src, theme, outline, pulses}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const span = outline.find((s) => frame >= s.from && frame < s.to);
  let filter = 'none';
  if (span) {
    const on = interpolate(frame, [span.from, span.from + 6, span.to - 4, span.to], [0, 1, 1, 0], clamp);
    const since = Math.min(...pulses.map((p) => (frame >= p ? frame - p : Infinity)));
    const kick = since < 12 ? spring({frame: since, fps, config: {damping: 9, stiffness: 300}, durationInFrames: 12}) * (1 - since / 12) : 0;
    const t = (6 + 5 * kick) * on;
    const glow = (18 + 30 * kick) * on;
    filter = [`drop-shadow(${t}px 0 0 #fff)`, `drop-shadow(-${t}px 0 0 #fff)`, `drop-shadow(0 ${t}px 0 #fff)`, `drop-shadow(0 -${t}px 0 #fff)`, `drop-shadow(0 0 ${glow}px ${theme.accent2})`].join(' ');
  }
  return (
    <AbsoluteFill style={{filter}}>
      {segments.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          <OffthreadVideo src={staticFile(src)} startFrom={Math.round(s.srcStart * fps)} transparent muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Giant word behind the speaker: slides up from behind the shoulders and is
// occluded by head and hair, so it never covers the face. `|` breaks lines;
// odd lines are outlined.
export const BehindText: React.FC<{o: BehindOverlay; theme: Theme}> = ({o, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = o.to - o.from;
  const s = spring({frame, fps, config: {damping: 13, stiffness: 180}});
  const exit = interpolate(frame, [dur - 5, dur], [1, 0], clamp);
  const lines = o.text.split('|').map((l) => l.trim());
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: o.y ?? 300, opacity: exit}}>
      <div style={{transform: `translateY(${(1 - s) * 260}px) scale(${0.85 + 0.15 * s})`, textAlign: 'center'}}>
        {lines.map((w, i) => (
          <div
            key={i}
            style={{
              fontFamily: displayFamily(),
              fontSize: Math.min(260, 1700 / Math.max(4, w.length)),
              lineHeight: 0.88,
              color: i % 2 ? 'transparent' : theme.paper,
              WebkitTextStroke: i % 2 ? `6px ${theme.paper}` : undefined,
              textTransform: 'uppercase',
              textShadow: i % 2 ? undefined : `0 0 40px ${theme.accent2}`,
              letterSpacing: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {w}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
