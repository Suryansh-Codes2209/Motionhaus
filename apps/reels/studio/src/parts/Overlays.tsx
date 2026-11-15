import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {displayFamily, family} from '../fonts';
import type {HookOverlay, SlamOverlay, StickerOverlay, Theme, WarningOverlay} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Frames are local to the overlay's Sequence (0 = its entrance).
const useExit = (dur: number, len = 6) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [dur - len, dur], [1, 0], clamp);
};

// Hook title in the top third: a white card that drops in. With strikeAt set,
// a red marker line scribbles through one line (the claim being rejected).
export const Hook: React.FC<{o: HookOverlay; theme: Theme}> = ({o, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = o.to - o.from;
  const enter = spring({frame, fps, config: {damping: 13, stiffness: 180}});
  const exit = useExit(dur);
  const strike = o.strikeAt != null ? interpolate(frame, [o.strikeAt - o.from, o.strikeAt - o.from + 7], [0, 1], clamp) : 0;
  return (
    <AbsoluteFill style={{alignItems: 'center'}}>
      <div
        style={{
          marginTop: 250,
          maxWidth: 900,
          padding: '26px 40px 30px',
          background: theme.paper,
          color: theme.ink,
          borderRadius: 30,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          fontFamily: family(theme.font),
          fontWeight: 900,
          fontSize: 70,
          lineHeight: 1.08,
          textAlign: 'center',
          letterSpacing: -1.5,
          transform: `translateY(${(1 - enter) * -160}px) rotate(${(1 - enter) * -6 - 1.5}deg) scale(${0.9 + 0.1 * exit})`,
          opacity: Math.min(1, enter * 2) * exit,
        }}
      >
        {o.lines.map((line, i) => (
          <div key={i} style={{position: 'relative', fontSize: i === 0 ? 70 : 44, fontWeight: i === 0 ? 900 : 700, opacity: i === 0 ? 1 : 0.65, marginTop: i ? 8 : 0}}>
            {line}
            {i === (o.strikeLine ?? 0) && strike > 0 ? (
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{position: 'absolute', left: -14, right: -14, top: '28%', width: 'calc(100% + 28px)', height: '44%', overflow: 'visible'}}>
                <path
                  d="M2 12 C 25 6, 45 15, 60 9 S 90 8, 98 10"
                  fill="none"
                  stroke={theme.accent2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - strike}
                  strokeWidth={16}
                />
              </svg>
            ) : null}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Topic sticker: a pill card that slaps in from the left and stacks under the
// previous one in its group (slot), e.g. KAL · Mythology / AAJ · Rap.
export const Sticker: React.FC<{o: StickerOverlay; theme: Theme}> = ({o, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 11, stiffness: 220}});
  const exit = useExit(o.to - o.from, 8);
  const tilt = [-4, 3, -2, 4][o.slot % 4];
  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        top: 270 + o.slot * 158,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '16px 34px 16px 18px',
        background: theme.paper,
        borderRadius: 999,
        boxShadow: `0 6px 0 ${theme.ink}, 0 18px 40px rgba(0,0,0,0.35)`,
        border: `5px solid ${theme.ink}`,
        fontFamily: family(theme.font),
        transform: `translateX(${(1 - enter) * -620 - (1 - exit) * 120}px) rotate(${tilt * enter}deg) scale(${0.8 + 0.2 * enter})`,
        opacity: exit,
      }}
    >
      <span style={{fontSize: 74, lineHeight: 1}}>{o.emoji}</span>
      <span style={{display: 'flex', flexDirection: 'column'}}>
        {o.tag ? (
          <span style={{alignSelf: 'flex-start', fontSize: 28, fontWeight: 900, letterSpacing: 2, color: theme.paper, background: theme.accent2, padding: '2px 12px', borderRadius: 8}}>{o.tag}</span>
        ) : null}
        <span style={{fontSize: 58, fontWeight: 900, color: theme.ink, letterSpacing: -1, lineHeight: 1.05}}>{o.label}</span>
      </span>
    </div>
  );
};

// Full-screen stamp for the one line that matters: white flash, dark scrim,
// huge outlined word that slams from 1.8x and settles with a tilt.
export const Slam: React.FC<{o: SlamOverlay; theme: Theme}> = ({o, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = o.to - o.from;
  const s = spring({frame, fps, config: {damping: 12, stiffness: 260, mass: 0.7}});
  const exit = useExit(dur, 5);
  const flash = interpolate(frame, [0, 1, 5], [0.85, 0.6, 0], clamp);
  const words = o.text.split(/\s+/);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, rgba(0,0,0,0.25), rgba(0,0,0,0.7))`, opacity: Math.min(1, frame / 3) * exit}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: exit}}>
        <div style={{transform: `scale(${1.8 - 0.8 * s}) rotate(${-5 * s}deg)`, textAlign: 'center'}}>
          {words.map((w, i) => (
            <div
              key={i}
              style={{
                fontFamily: displayFamily(),
                fontSize: Math.min(210, 1700 / Math.max(6, w.length)),
                lineHeight: 0.95,
                color: i % 2 ? theme.paper : theme.accent,
                WebkitTextStroke: `18px ${theme.ink}`,
                paintOrder: 'stroke fill',
                textTransform: 'uppercase',
                textShadow: '0 20px 50px rgba(0,0,0,0.6)',
              }}
            >
              {w}
            </div>
          ))}
          {o.sub ? (
            <div style={{marginTop: 26, fontFamily: family(theme.font), fontWeight: 900, fontSize: 54, color: theme.ink, background: theme.accent, display: 'inline-block', padding: '6px 22px', borderRadius: 10, transform: 'rotate(2deg)'}}>
              {o.sub}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};

// Caution tape: two striped bands sweep across the frame and the text crawls
// along them. Stays up into the outro.
export const Warning: React.FC<{o: WarningOverlay; theme: Theme}> = ({o, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const band = (angle: number, top: number, delay: number, dir: 1 | -1) => {
    const s = spring({frame: frame - delay, fps, config: {damping: 16, stiffness: 160}});
    const crawl = (frame * 9 * dir) % 900;
    const text = Array(8).fill(`⚠ ${o.text}`).join('   ');
    return (
      <div
        style={{
          position: 'absolute',
          left: -400,
          right: -400,
          top,
          height: 128,
          transform: `rotate(${angle}deg) translateX(${(1 - s) * 2400 * dir}px)`,
          background: `repeating-linear-gradient(-45deg, ${theme.accent} 0 46px, ${theme.ink} 46px 92px)`,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          borderTop: `8px solid ${theme.ink}`,
          borderBottom: `8px solid ${theme.ink}`,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            whiteSpace: 'nowrap',
            transform: `translateX(${crawl - 900}px)`,
            fontFamily: displayFamily(),
            fontSize: 70,
            color: theme.ink,
            background: theme.accent,
            padding: '0 30px',
            letterSpacing: 1,
          }}
        >
          {text}
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      {band(-8, 250, 0, 1)}
      {band(6, 1530, 4, -1)}
    </AbsoluteFill>
  );
};
