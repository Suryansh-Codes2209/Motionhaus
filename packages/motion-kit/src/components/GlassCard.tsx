import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {clamp, useUnit} from '../lib/util';
import {style} from '../styles';
import {config} from '../video.config';

// The style's card surface (frosted glass for radar, paper for vox, phosphor
// box for terminal…) with a diagonal light sheen that sweeps across once it
// lands, when the style uses one.
export const GlassCard: React.FC<{
  children: React.ReactNode;
  width: number;
  sheenAt: number; // local frame when the sheen starts
  style?: React.CSSProperties;
}> = ({children, width, sheenAt, style: css}) => {
  const frame = useCurrentFrame();
  const u = useUnit();
  const sheen = interpolate(frame, [sheenAt, sheenAt + 22], [-60, 160], clamp);

  return (
    <div
      style={{
        position: 'relative',
        width,
        padding: 36 * u,
        overflow: 'hidden',
        ...style.card(config.brand.colors, u),
        ...css,
      }}
    >
      {children}
      {style.sheen ? <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)',
          transform: `translateX(${sheen}%)`,
          pointerEvents: 'none',
        }}
      /> : null}
    </div>
  );
};
