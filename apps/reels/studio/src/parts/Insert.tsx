import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Huashu} from '../engines/Huashu';
import {Explainer} from '../lab/ArtLab';
import {MotionCanvasDemo} from '../lab/MotionCanvasLab';
import {RiveClip} from '../lab/RiveLab';
import {Title3D} from '../lab/ThreeLab';
import {AnimeGrid, GsapTitle} from '../lab/TimelineLab';
import {family} from '../fonts';
import type {InsertOverlay, Theme} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// What an insert can show. Each engine renders from its own local frame 0
// (the insert's Sequence), so its animation starts when the insert does.
const Engine: React.FC<{o: InsertOverlay}> = ({o}) => {
  const p = o.props ?? {};
  switch (o.engine) {
    case 'art':
      return <Huashu kind="style" id={String(p.id ?? '09_postimp')} focusX={Number(p.focusX ?? 0.4)} offset={Number(p.offset ?? 0)} fit="cover" />;
    case 'explainer':
      return <Explainer spec={String(p.spec)} />;
    case 'gsap-title':
      return <GsapTitle title={String(p.title ?? '')} subtitle={String(p.subtitle ?? '')} />;
    case 'anime-grid':
      return <AnimeGrid label={String(p.label ?? '')} />;
    case 'title3d':
      return <Title3D lines={(p.lines as string[]) ?? []} />;
    case 'motion-canvas':
      return <MotionCanvasDemo title={String(p.title ?? '')} />;
    case 'rive':
      return <RiveClip file={String(p.file)} animation={p.animation as string | undefined} fit="cover" />;
  }
};

// Cutaway while the voice keeps going. `full` covers the frame (B-roll cut:
// 4-frame zoom-in, white flash); `pip` floats it as a tilted card in the top
// half so the speaker stays visible below. An optional `label` chip names it.
export const Insert: React.FC<{o: InsertOverlay; theme: Theme}> = ({o, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = o.to - o.from;
  const exit = interpolate(frame, [dur - 4, dur], [1, 0], clamp);
  const label = o.label ? (
    <div
      style={{
        position: 'absolute',
        left: 56,
        top: o.mode === 'pip' ? 1010 : 230,
        fontFamily: family(theme.font),
        fontWeight: 900,
        fontSize: 60,
        color: theme.ink,
        background: theme.accent,
        padding: '8px 22px',
        borderRadius: 12,
        transform: `rotate(-3deg) scale(${spring({frame: frame - 4, fps, config: {damping: 12}})})`,
      }}
    >
      {o.label}
    </div>
  ) : null;

  if (o.mode === 'pip') {
    const s = spring({frame, fps, config: {damping: 14, stiffness: 170}});
    return (
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: 110,
            top: 170,
            width: 860,
            height: 860,
            borderRadius: 44,
            overflow: 'hidden',
            border: `8px solid ${theme.paper}`,
            boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            transform: `translateY(${(1 - s) * -900}px) rotate(${(1 - s) * -10 + 2}deg) scale(${0.9 + 0.1 * exit})`,
            opacity: exit,
          }}
        >
          {/* render the engine at full 1080x1920, scale it to the window's width, keep the vertical centre */}
          <div style={{position: 'absolute', width: 1080, height: 1920, left: 0, top: (860 - 1920 * (860 / 1080)) / 2, transform: `scale(${860 / 1080})`, transformOrigin: '0 0'}}>
            <Engine o={o} />
          </div>
        </div>
        {label}
      </AbsoluteFill>
    );
  }

  const zoom = interpolate(frame, [0, 4], [1.25, 1], clamp);
  const flash = interpolate(frame, [0, 3], [0.7, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: exit}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        <Engine o={o} />
      </AbsoluteFill>
      {label}
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};
