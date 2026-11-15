import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {GlitchText} from '../components/fx/text';
import {GlassCard} from '../components/GlassCard';
import {labelFamily, monoFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, useUnit} from '../lib/util';
import {style} from '../styles';
import type {SceneOf} from '../types';
import {config} from '../video.config';

const CPF = 1.4; // typed characters per frame for "$ " commands
const MAX_VISIBLE = 11;

// terminal: a CLI session streaming output. "$ " lines type themselves, other
// lines print instantly a few frames apart, coloured by prefix:
// "+ " ok (accent), "! " warning (accent2), "> " info (muted).
export const Log: React.FC<{scene: SceneOf<'log'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const mono = style.name === 'terminal' ? labelFamily : monoFamily;

  // Schedule: when each line starts and how long it takes.
  let t = enter + fpb * 0.6;
  const sched = scene.lines.map((line) => {
    const cmd = line.startsWith('$ ');
    const start = t;
    const len = cmd ? Math.ceil((line.length - 2) / CPF) : 0;
    t = start + len + (cmd ? fpb * 0.5 : fpb * 0.25);
    return {line, cmd, start, len};
  });
  const shown = sched.filter((l) => frame >= l.start);
  const visible = shown.slice(-MAX_VISIBLE);
  const box = spring({frame: frame - enter, fps, config: {damping: 16, stiffness: 140}});

  const colorFor = (line: string) =>
    line.startsWith('+ ') ? colors.accent : line.startsWith('! ') ? colors.accent2 : line.startsWith('> ') ? colors.muted : colors.fg;

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 240 * u}}>
      <div style={{transform: `translateY(${(1 - box) * 120 * u}px)`, opacity: box}}>
        <GlassCard width={width * 0.9} sheenAt={enter + 8} style={{padding: 0}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12 * u, padding: `${20 * u}px ${28 * u}px`, borderBottom: `${1.5 * u}px solid ${alpha(colors.fg, 0.12)}`, fontFamily: mono, fontSize: 26 * u, color: colors.muted}}>
            {style.name === 'terminal' ? (
              <span style={{color: colors.accent}}>
                [ <GlitchText text={scene.title ?? 'session'} bursts={[enter + 2, enter + fpb * 3]} colorA={colors.accent} colorB={colors.accent2} /> ]
              </span>
            ) : (
              <>
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                  <span key={c} style={{width: 18 * u, height: 18 * u, borderRadius: '50%', background: c}} />
                ))}
                <span style={{marginLeft: 12 * u}}>{scene.title ?? 'zsh'}</span>
              </>
            )}
          </div>
          <div style={{padding: `${24 * u}px ${30 * u}px ${30 * u}px`, minHeight: 520 * u, fontFamily: mono, fontSize: 32 * u, lineHeight: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>
            {visible.map((l, i) => {
              const typing = l.cmd && frame < l.start + l.len;
              const text = l.cmd ? l.line.slice(2, 2 + Math.max(0, Math.floor((frame - l.start) * CPF))) : l.line.replace(/^[+!>] /, '');
              const last = i === visible.length - 1;
              const cursor = last && (typing || Math.floor(frame / 8) % 2 === 0);
              return (
                <div key={l.start} style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: l.cmd ? colors.fg : colorFor(l.line)}}>
                  <Sfx name="tick" at={l.start} i={sched.indexOf(l)} volume={l.cmd ? 0.25 : 0.12} />
                  {l.cmd ? <span style={{color: colors.accent}}>$ </span> : l.line.startsWith('+ ') ? '✓ ' : l.line.startsWith('! ') ? '▲ ' : ''}
                  {text}
                  {cursor ? <span style={{color: colors.accent}}>▍</span> : null}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </AbsoluteFill>
  );
};
