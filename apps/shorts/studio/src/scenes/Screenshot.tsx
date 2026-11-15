import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BrowserFrame, PhoneFrame} from '../components/Devices';
import {KineticText} from '../components/KineticText';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// The product shot: device flies in tilted in 3D, settles, then keeps drifting
// while the screen scrolls or slowly zooms.
export const Screenshot: React.FC<{scene: SceneOf<'screenshot'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, duration, fpb} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const phone = scene.device === 'phone';

  const s = spring({frame: frame - enter, fps, config: {damping: 18, stiffness: 80, mass: 1}});
  const rotX = interpolate(s, [0, 1], [32, 7]) + interpolate(frame, [0, duration], [0, -5]);
  const rotY = interpolate(s, [0, 1], [-22, -5]) + interpolate(frame, [0, duration], [0, 8]);
  const y = interpolate(s, [0, 1], [height * 0.45, 0]);
  const scale = interpolate(s, [0, 1], [0.8, 1]);
  const progress = interpolate(frame, [enter + fpb, duration], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const caption = scene.caption ? 150 * u : 0;
  const availH = height - caption - 160 * u;
  let fw: number;
  let fh: number;
  if (phone) {
    fh = Math.min(availH, portrait ? height * 0.66 : height * 0.78);
    fw = fh / 2.05;
  } else {
    fw = portrait ? width * 0.88 : width * 0.66;
    fh = Math.min(availH, fw * 0.64);
  }

  const device = phone ? (
    <PhoneFrame src={scene.image} width={fw} height={fh} scroll={scene.scroll} progress={progress} />
  ) : (
    <BrowserFrame
      src={scene.image}
      width={fw}
      height={fh}
      url={config.brand.url}
      scroll={scene.scroll}
      progress={progress}
    />
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 50 * u,
      }}
    >
      {scene.caption ? (
        <KineticText text={scene.caption} size={64 * u} fitWidth={width * 0.88} delay={enter + 4} />
      ) : null}
      <div style={{perspective: 2400 * u, position: 'relative'}}>
        <div
          style={{
            position: 'absolute',
            inset: '15% 10% -10% 10%',
            background: `radial-gradient(ellipse at center, ${alpha(config.brand.colors.accent, 0.55)}, transparent 70%)`,
            filter: `blur(${60 * u}px)`,
            opacity: s,
          }}
        />
        <div
          style={{
            transform: `translateY(${y}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`,
            transformStyle: 'preserve-3d',
            opacity: Math.min(1, s * 2),
          }}
        >
          {device}
        </div>
      </div>
    </AbsoluteFill>
  );
};
