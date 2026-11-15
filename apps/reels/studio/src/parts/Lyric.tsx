import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {family} from '../fonts';
import type {EmojiOverlay, LyricOverlay, LyricWord, SparkleOverlay} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Kinetic lyric typography: each block is a small composition placed in the
// empty space beside the performer, mixing an elegant serif, a fat rounded
// word, neon and script. Every word arrives on its own sung frame with a
// blur-in, the block drifts, then clears for the next phrase.
const STYLES: Record<NonNullable<LyricWord['style']>, (c: string) => React.CSSProperties> = {
  serif: (c) => ({fontFamily: family('Playfair'), fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', color: c, textShadow: '0 4px 24px rgba(0,0,0,0.55)'}),
  fat: (c) => ({fontFamily: family('Fredoka'), fontWeight: 700, color: c, letterSpacing: '-0.01em', textShadow: '0 5px 0 rgba(0,0,0,0.22), 0 12px 34px rgba(0,0,0,0.45)'}),
  neon: (c) => ({fontFamily: family('Poppins'), fontWeight: 800, color: '#FFFDF8', textShadow: `0 0 8px ${c}, 0 0 22px ${c}, 0 0 48px ${c}, 0 0 90px ${c}`}),
  script: (c) => ({fontFamily: family('Dancing'), fontWeight: 700, color: c, textShadow: `0 0 18px ${c}99, 0 6px 22px rgba(0,0,0,0.5)`}),
  bold: (c) => ({fontFamily: family('Poppins'), fontWeight: 900, color: c, letterSpacing: '-0.02em', textShadow: '0 8px 30px rgba(0,0,0,0.55)'}),
  outline: (c) => ({fontFamily: family('Anton'), color: 'transparent', WebkitTextStroke: `4px ${c}`, textTransform: 'uppercase', letterSpacing: '0.04em'}),
};

const Word: React.FC<{w: LyricWord; frame: number}> = ({w, frame}) => {
  const {fps} = useVideoConfig();
  const lf = frame - w.at;
  if (lf < 0) return <span style={{...STYLES[w.style ?? 'bold'](w.color ?? '#fff'), fontSize: w.size ?? 96, opacity: 0}}>{w.t}</span>;
  const p = spring({frame: lf, fps, config: {damping: 15, stiffness: 170}});
  const base: React.CSSProperties = {...STYLES[w.style ?? 'bold'](w.color ?? '#fff'), fontSize: w.size ?? 96, display: 'inline-block', lineHeight: 1, whiteSpace: 'pre'};
  const nudge = `translate(${w.dx ?? 0}px, ${w.dy ?? 0}px) rotate(${w.rot ?? 0}deg)`;
  if (w.in === 'type') {
    // letters appear one by one over ~0.4 s
    const shown = Math.min(w.t.length, Math.floor(lf / Math.max(1, 12 / w.t.length)) + 1);
    return (
      <span style={{...base, transform: nudge}}>
        {w.t.slice(0, shown)}
        <span style={{opacity: 0}}>{w.t.slice(shown)}</span>
      </span>
    );
  }
  const drop = w.in === 'drop';
  const scale = drop ? 1.7 - 0.7 * p : 0.86 + 0.14 * p;
  const rise = drop ? 0 : (1 - p) * 28;
  return (
    <span
      style={{
        ...base,
        opacity: interpolate(lf, [0, 4], [0, 1], clamp),
        filter: `blur(${(1 - p) * 14}px)`,
        transform: `${nudge} translateY(${rise}px) scale(${scale})`,
      }}
    >
      {w.t}
    </span>
  );
};

export const Lyric: React.FC<{o: LyricOverlay}> = ({o}) => {
  const frame = useCurrentFrame();
  const dur = o.to - o.from;
  const out = interpolate(frame, [dur - 6, dur], [0, 1], clamp);
  // words → rows (a word with `br` starts a new row)
  const rows: LyricWord[][] = [];
  for (const w of o.words) {
    if (w.br || rows.length === 0) rows.push([]);
    rows[rows.length - 1].push(w);
  }
  const align = o.align ?? 'left';
  const bob = Math.sin(frame / 22) * 5;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: o.y,
          ...(align === 'right' ? {right: 1080 - o.x} : align === 'center' ? {left: o.x, transform: 'translateX(-50%)'} : {left: o.x}),
          display: 'flex',
          flexDirection: 'column',
          alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          gap: o.gap ?? 4,
          opacity: 1 - out,
          filter: `blur(${out * 10}px)`,
        }}
      >
        <div style={{transform: `translateY(${bob - out * 30}px) rotate(${o.rot ?? 0}deg)`, display: 'flex', flexDirection: 'column', alignItems: 'inherit', gap: 'inherit'}}>
          {rows.map((r, i) => (
            <div key={i} style={{display: 'flex', gap: '0 26px', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
              {r.map((w, j) => (
                <Word key={j} w={w} frame={frame} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Four-point stars twinkling inside a box.
export const Sparkles: React.FC<{o: SparkleOverlay}> = ({o}) => {
  const frame = useCurrentFrame();
  const dur = o.to - o.from;
  const env = interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  const n = o.count ?? 14;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: env}}>
      {Array.from({length: n}, (_, i) => {
        const x = o.x + random(`sx${o.id}-${i}`) * o.w;
        const y = o.y + random(`sy${o.id}-${i}`) * o.h;
        const size = 14 + random(`ss${o.id}-${i}`) * 34;
        const phase = random(`sp${o.id}-${i}`) * Math.PI * 2;
        const tw = 0.5 + 0.5 * Math.sin(frame / (5 + 4 * random(`sf${o.id}-${i}`)) + phase);
        const c = o.color ?? '#FFF3C4';
        return (
          <svg key={i} width={size} height={size} viewBox="-10 -10 20 20" style={{position: 'absolute', left: x, top: y - frame * 0.4, opacity: tw, transform: `scale(${0.5 + tw * 0.6}) rotate(${frame * 2}deg)`, filter: `drop-shadow(0 0 6px ${c})`}}>
            <path d="M0 -10 Q1.2 -1.2 10 0 Q1.2 1.2 0 10 Q-1.2 1.2 -10 0 Q-1.2 -1.2 0 -10Z" fill={c} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

// Emoji sticker that pops in and floats.
export const Emoji: React.FC<{o: EmojiOverlay}> = ({o}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = o.to - o.from;
  const s = spring({frame, fps, config: {damping: 9, stiffness: 220}});
  const out = interpolate(frame, [dur - 6, dur], [1, 0], clamp);
  const bob = Math.sin(frame / 9) * 10;
  return (
    <div
      style={{
        position: 'absolute',
        left: o.x,
        top: o.y,
        fontSize: o.size ?? 120,
        lineHeight: 1,
        fontFamily: family('Montserrat'),
        transform: `translateY(${bob}px) scale(${s * out}) rotate(${(o.rot ?? 0) + Math.sin(frame / 14) * 6}deg)`,
        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
      }}
    >
      {o.emoji}
    </div>
  );
};

// White flash for beat-drop transitions (the camera kick lives in Footage).
export const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background: '#FFF8F0', opacity: interpolate(frame, [0, 2, 8], [0.9, 0.55, 0], clamp)}} />;
};
