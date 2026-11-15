import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {Highlighter, Tape, tornClip} from '../components/fx/paper';
import {Typewriter} from '../components/fx/text';
import {labelFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import {useImageSize} from '../lib/useImageSize';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// vox: the screenshot is a newspaper clipping slapped onto the page (torn
// edge, tape, hard shadow). The camera creeps toward the focus point while a
// marker circles / underlines / highlights it and a typewriter label types out.
export const Clipping: React.FC<{scene: SceneOf<'clipping'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb, duration, index} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const size = useImageSize(scene.image);
  if (!size) return null;

  // Fit inside the safe content area (above the caption band).
  const maxW = width * 0.84;
  const maxH = height * 0.5;
  const k = Math.min(maxW / size.w, maxH / size.h);
  const w = size.w * k;
  const h = size.h * k;
  const left = (width - w) / 2;
  const top = height * 0.42 - h / 2;

  const f = scene.focus ?? {x: 0.5, y: 0.4, w: 0.4, h: 0.12};
  const fw = (f.w ?? 0.35) * w;
  const fh = (f.h ?? 0.1) * h;
  const box = {x: left + f.x * w - fw / 2, y: top + f.y * h - fh / 2, w: fw, h: fh};

  const slap = spring({frame: frame - enter, fps, config: {damping: 13, stiffness: 170, mass: 0.9}});
  const rot = interpolate(slap, [0, 1], [-9, index % 2 ? 1.8 : -1.6]);
  const markAt = enter + fpb * 1.5;
  const push = interpolate(frame, [markAt, duration], [1, 1.14], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const ox = ((box.x + box.w / 2) / width) * 100;
  const oy = ((box.y + box.h / 2) / height) * 100;
  const kind = scene.mark ?? 'circle';

  return (
    <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: `${ox}% ${oy}%`}}>
      <Sfx name="whoosh-2" at={enter - 4} volume={0.4} />
      <Sfx name="tick" at={markAt} volume={0.5} />
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: w,
          height: h,
          transform: `translateY(${(1 - slap) * height * 0.6}px) rotate(${rot}deg) scale(${0.9 + 0.1 * slap})`,
          filter: `drop-shadow(${10 * u}px ${14 * u}px 0 ${alpha(colors.fg, 0.85)})`,
        }}
      >
        <div style={{position: 'absolute', inset: 0, clipPath: tornClip(`clip${index}`), background: '#fff', padding: 10 * u}}>
          <Img src={staticFile(scene.image)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05) saturate(0.9)'}} />
        </div>
        <Tape x={w * 0.12} y={6 * u} w={170 * u} h={46 * u} angle={-24} />
        <Tape x={w * 0.88} y={h - 6 * u} w={170 * u} h={46 * u} angle={-18} />
      </div>
      {kind === 'highlight' ? (
        <div style={{position: 'absolute', inset: 0, transform: `rotate(${rot}deg)`, transformOrigin: `${left + w / 2}px ${top + h / 2}px`}}>
          <Highlighter box={box} kind="highlight" start={markAt} color={colors.accent} width={width} height={height} />
        </div>
      ) : (
        <Highlighter box={box} kind={kind} start={markAt} duration={16} color={colors.accent2} stroke={8 * u} width={width} height={height} seed={`clip${index}`} />
      )}
      {scene.label && frame >= markAt + fpb ? (
        <div
          style={{
            position: 'absolute',
            top: top + h + 70 * u,
            left: width * 0.08,
            right: width * 0.08,
            textAlign: 'center',
            fontFamily: labelFamily,
            fontWeight: 700,
            fontSize: 46 * u,
            color: colors.fg,
          }}
        >
          <span style={{background: alpha(colors.bg, 0.9), padding: `${6 * u}px ${18 * u}px`, boxShadow: `${5 * u}px ${5 * u}px 0 ${colors.fg}`, border: `${3 * u}px solid ${colors.fg}`}}>
            <Typewriter text={scene.label} start={markAt + fpb} cps={0.9} cursor={false} />
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
