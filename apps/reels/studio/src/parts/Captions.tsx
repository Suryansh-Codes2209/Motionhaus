import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {family} from '../fonts';
import type {CaptionPage, Theme} from '../types';

// Reel captions: 1–3 words a page, upper case, thick outline. The word being
// spoken pops and turns the accent colour; emphasis words stay in accent2.
// Sits under the face and above Instagram's bottom caption/UI (~ bottom 22%),
// clear of the right action rail. `y` moves them, e.g. above the head (~300).
export const Captions: React.FC<{pages: CaptionPage[]; theme: Theme; y?: number; look?: 'pop' | 'lines'}> = ({pages, theme, y = 1340, look = 'pop'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const page = pages.find((p) => frame >= p.from && frame < p.to);
  if (!page) return null;
  if (look === 'lines') return <LineCaption page={page} theme={theme} y={y} />;

  const pop = spring({frame: frame - page.from, fps, config: {damping: 14, stiffness: 300}});
  const out = interpolate(frame, [page.to - 2, page.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: y, left: 70, right: 150, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0 34px',
            fontFamily: family(theme.font),
            fontWeight: 900,
            fontSize: 92,
            lineHeight: 1.08,
            textTransform: 'uppercase',
            letterSpacing: -1,
            transform: `translateY(${(1 - pop) * 26}px) scale(${0.86 + 0.14 * pop})`,
            opacity: Math.min(1, pop * 2) * out,
          }}
        >
          {page.words.map((w, i) => {
            const next = page.words[i + 1]?.from ?? page.to;
            const active = frame >= w.from && frame < next;
            const spoken = frame >= w.from;
            const hit = spring({frame: frame - w.from, fps, config: {damping: 10, stiffness: 380}, durationInFrames: 9});
            const color = active ? theme.accent : w.emphasis && spoken ? theme.accent2 : theme.paper;
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color,
                  WebkitTextStroke: `16px ${theme.ink}`,
                  paintOrder: 'stroke fill',
                  textShadow: '0 10px 30px rgba(0,0,0,0.55)',
                  transform: `scale(${active ? 1 + 0.12 * Math.sin(Math.min(1, hit) * Math.PI) : 1}) rotate(${active && w.emphasis ? -3 : 0}deg)`,
                  opacity: spoken ? 1 : 0.9,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Subtitle look: the whole line at once, a short fade, no bounce and no
// per-word colour, so it reads like song lyrics rather than a talking head.
const LineCaption: React.FC<{page: CaptionPage; theme: Theme; y: number}> = ({page, theme, y}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [page.from, page.from + 4, page.to - 3, page.to], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: y,
          left: 90,
          right: 90,
          textAlign: 'center',
          fontFamily: family(theme.font),
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 1.18,
          color: theme.paper,
          WebkitTextStroke: `10px ${theme.ink}`,
          paintOrder: 'stroke fill',
          textShadow: `0 0 28px ${theme.accent2}88, 0 6px 18px rgba(0,0,0,0.5)`,
          opacity,
        }}
      >
        {page.words.map((w) => w.text).join(' ')}
      </div>
    </AbsoluteFill>
  );
};
