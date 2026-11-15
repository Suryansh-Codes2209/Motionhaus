import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {bodyFamily, displayFamily, displayMaxWeight, labelFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import {style} from '../styles';
import type {SceneOf} from '../types';
import {config} from '../video.config';

const CONTEXT = 230; // characters of surrounding text kept on each side

// vox: a page of real text (README, post, docs). The quote sits at the
// optical centre; the camera pushes in while a marker sweeps across it and
// the surrounding text dims away.
export const DocumentScene: React.FC<{scene: SceneOf<'document'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb, duration} = useScene();
  const u = useUnit();
  const {colors} = config.brand;

  const at = scene.body.indexOf(scene.quote);
  const before = at >= 0 ? scene.body.slice(Math.max(0, at - CONTEXT), at) : scene.body.slice(0, CONTEXT);
  const after = at >= 0 ? scene.body.slice(at + scene.quote.length, at + scene.quote.length + CONTEXT) : '';
  const lead = at > CONTEXT ? '…' : '';

  const page = spring({frame: frame - enter, fps, config: {damping: 16, stiffness: 110}});
  const markAt = enter + fpb * 1.2;
  const mark = interpolate(frame, [markAt, markAt + fpb * 1.4], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const push = interpolate(frame, [enter, duration], [1, 1.1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const dim = interpolate(frame, [markAt, markAt + fpb * 2], [1, 0.35], clamp);
  const paper = style.name === 'vox' ? '#FFFDF7' : alpha(colors.fg, 0.06);
  const ink = style.name === 'vox' ? '#1A1712' : colors.fg;
  const fade = 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)';

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <Sfx name="whoosh-1" at={enter - 4} volume={0.35} />
      <Sfx name="tick" at={markAt} volume={0.45} />
      <div
        style={{
          position: 'absolute',
          top: height * 0.15,
          width: width * 0.84,
          height: height * 0.52,
          background: paper,
          border: style.name === 'vox' ? `${3 * u}px solid ${ink}` : `${1.5 * u}px solid ${alpha(colors.fg, 0.14)}`,
          boxShadow: style.name === 'vox' ? `${12 * u}px ${14 * u}px 0 ${alpha(ink, 0.85)}` : `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.35)`,
          transform: `translateY(${(1 - page) * height * 0.5}px) rotate(${(1 - page) * 6 - 0.8}deg) scale(${push})`,
          transformOrigin: '50% 55%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {scene.title || scene.source ? (
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 * u, padding: `${34 * u}px ${44 * u}px ${18 * u}px`, borderBottom: `${2 * u}px solid ${alpha(ink, 0.2)}`}}>
            <div style={{fontFamily: displayFamily, fontWeight: Math.min(900, displayMaxWeight), fontSize: 46 * u, color: ink, letterSpacing: '-0.01em', lineHeight: 1.1}}>{scene.title}</div>
            {scene.source ? <div style={{fontFamily: labelFamily, fontSize: 24 * u, color: alpha(ink, 0.6), whiteSpace: 'nowrap'}}>{scene.source}</div> : null}
          </div>
        ) : null}
        <div style={{flex: 1, display: 'flex', alignItems: 'center', padding: `0 ${44 * u}px`, maskImage: fade, WebkitMaskImage: fade}}>
          <div style={{fontFamily: bodyFamily, fontSize: 38 * u, lineHeight: 1.55, color: ink}}>
            <span style={{opacity: dim}}>
              {lead}
              {before}
            </span>
            <span
              style={{
                fontWeight: 700,
                backgroundImage: `linear-gradient(100deg, ${alpha(colors.accent, 0.8)}, ${alpha(colors.accent, 0.65)})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${mark * 100}% 100%`,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
                padding: `0 ${4 * u}px`,
                color: style.name === 'vox' ? ink : mark > 0.5 ? colors.bg : ink,
              }}
            >
              {scene.quote}
            </span>
            <span style={{opacity: dim}}>{after}…</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
