import {noise2D} from '@remotion/noise';
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {useUnit} from '../lib/util';
import {look} from '../styles';

const SHAKE_FRAMES = 12;

// A virtual camera over the whole edit: slow push-in, handheld micro-rotation,
// and a decaying shake on every impact frame.
export const CameraRig: React.FC<{children: React.ReactNode; shakes: number[]}> = ({
  children,
  shakes,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const u = useUnit();
  const drift = look.cameraDrift;

  const push = drift ? interpolate(frame, [0, durationInFrames], [1, 1.05]) : 1;
  const rot = drift ? noise2D('rot', frame * 0.008, 0) * 0.5 : 0;

  let sx = 0;
  let sy = 0;
  for (const s of shakes) {
    const d = frame - s;
    if (d < 0 || d >= SHAKE_FRAMES) continue;
    const amp = Math.pow(1 - d / SHAKE_FRAMES, 2) * 16 * u;
    sx += noise2D('sx', d * 0.9, s) * amp;
    sy += noise2D('sy', s, d * 0.9) * amp;
  }

  return (
    <AbsoluteFill
      style={{transform: `translate(${sx}px, ${sy}px) scale(${push}) rotate(${rot}deg)`}}
    >
      {children}
    </AbsoluteFill>
  );
};
