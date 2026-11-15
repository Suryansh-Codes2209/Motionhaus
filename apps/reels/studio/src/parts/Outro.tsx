import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {family} from '../fonts';
import type {Theme} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// End card over the blurred last frame: handle, title, and a follow button
// that gets tapped (ripple) and flips to "Following".
export const Outro: React.FC<{title: string; cta: string; handle: string; dur: number; theme: Theme}> = ({title, cta, handle, dur, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - 2, fps, config: {damping: 13, stiffness: 200}});
  const tapAt = Math.round(dur * 0.55);
  const tapped = frame >= tapAt;
  const press = tapped ? 1 - 0.08 * Math.sin(interpolate(frame, [tapAt, tapAt + 6], [0, Math.PI], clamp)) : 1;
  const ripple = interpolate(frame, [tapAt, tapAt + 14], [0, 1], clamp);
  const finger = interpolate(frame, [tapAt - 10, tapAt], [180, 0], clamp);

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: family(theme.font)}}>
      <div style={{transform: `translateY(${(1 - enter) * 80}px)`, opacity: enter, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        {handle ? <div style={{fontSize: 64, fontWeight: 900, color: theme.paper, letterSpacing: -1, textShadow: '0 8px 30px rgba(0,0,0,0.6)'}}>{handle}</div> : null}
        <div style={{fontSize: 46, fontWeight: 800, color: theme.accent, textTransform: 'uppercase', letterSpacing: 2}}>{title}</div>
        <div style={{position: 'relative', marginTop: 20}}>
          <div
            style={{
              padding: '26px 90px',
              borderRadius: 22,
              fontSize: 54,
              fontWeight: 900,
              color: tapped ? theme.paper : theme.ink,
              background: tapped ? 'rgba(255,255,255,0.18)' : theme.accent,
              border: tapped ? '3px solid rgba(255,255,255,0.5)' : `3px solid ${theme.accent}`,
              transform: `scale(${press})`,
            }}
          >
            {tapped ? 'Following ✓' : cta}
          </div>
          {tapped ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 400,
                height: 400,
                marginLeft: -200,
                marginTop: -200,
                borderRadius: '50%',
                border: `6px solid ${theme.accent}`,
                transform: `scale(${0.2 + ripple})`,
                opacity: 1 - ripple,
              }}
            />
          ) : null}
          <div style={{position: 'absolute', left: '62%', top: '58%', fontSize: 96, transform: `translate(${finger}px, ${finger}px)`, opacity: frame < tapAt + 18 ? 1 : 0}}>👆</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
