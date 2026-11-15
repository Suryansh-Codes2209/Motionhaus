import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {GlitchBurst} from '../components/fx/screen';
import {Padlock} from '../components/fx/padlock';
import {displayFamily, displayMaxWeight, monoFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');

// Brute force, shown: the key as a grid of bytes (all 00 but the last), the
// last byte spinning like a slot reel while a counter runs up, then it lands
// on the real value, the cell lights up, a padlock springs open and a stamp
// slams on. For "the key was guessable" stories: weak keys, short PINs,
// default passwords.
export const Crack: React.FC<{scene: SceneOf<'crack'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb, duration} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const bytes = scene.bytes ?? 48;
  const cols = 8;
  const rows = Math.ceil(bytes / cols);
  const spinAt = enter + Math.round(fpb * 1.5);
  // the find lands near the end, where the VO pays it off ("…you have the key")
  const foundAt = Math.max(spinAt + fpb * 4, duration - fpb * 5);
  // the reel speeds up, then slows into the value like a slot machine
  const spin = interpolate(frame, [spinAt, foundAt], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const n = frame >= foundAt ? scene.value : Math.max(1, Math.round(spin * scene.value));
  const found = frame >= foundAt;
  const pop = spring({frame: frame - foundAt, fps, config: {damping: 9, stiffness: 220}});
  const open = spring({frame: frame - foundAt - 3, fps, config: {damping: 10, stiffness: 140}});
  const stamp = spring({frame: frame - foundAt - fpb, fps, config: {damping: 12, stiffness: 260, mass: 0.8}});

  const plate = '#0E1014';
  const cell = (portrait ? 92 : 84) * u;
  const gap = 10 * u;
  const gridW = cols * cell + (cols - 1) * gap;
  const lockW = (portrait ? 420 : 520) * u;
  const scan = interpolate(frame, [spinAt, foundAt], [0, 1], clamp);

  const grid = (
    <div style={{position: 'relative', padding: 28 * u, borderRadius: 24 * u, background: plate, boxShadow: `0 ${30 * u}px ${80 * u}px ${alpha('#000000', 0.45)}`, border: `${2 * u}px solid ${alpha('#ffffff', 0.08)}`}}>
      <div style={{fontFamily: monoFamily, fontSize: 24 * u, color: alpha('#ffffff', 0.5), marginBottom: 16 * u, letterSpacing: 2}}>PRIVATE KEY · {bytes} BYTES</div>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap, width: gridW}}>
        {Array.from({length: bytes}, (_, i) => {
          const last = i === bytes - 1;
          const inAt = enter + Math.floor(i / cols) * 2 + (i % cols);
          const s = spring({frame: frame - inAt, fps, config: {damping: 16, stiffness: 200}});
          const live = last && frame >= spinAt;
          const value = last ? (live ? hex(found ? scene.value : (n * 37 + frame * 13) % 256) : '??') : '00';
          return (
            <div
              key={i}
              style={{
                height: cell * 0.78,
                borderRadius: 10 * u,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: monoFamily,
                fontWeight: 700,
                fontSize: cell * 0.36,
                color: last ? (found ? '#0E1014' : colors.accent) : alpha('#ffffff', 0.32),
                background: last ? (found ? colors.accent : alpha(colors.accent, 0.14)) : alpha('#ffffff', 0.04),
                border: `${2 * u}px solid ${last ? colors.accent : alpha('#ffffff', 0.06)}`,
                boxShadow: last && found ? `0 0 ${40 * u * pop}px ${colors.accent}` : undefined,
                opacity: s,
                transform: `translateY(${(1 - s) * 30 * u}px) scale(${last && found ? 1 + 0.25 * (1 - pop) + 0.12 * pop : 1})`,
                filter: live && !found ? `blur(${(1 - Math.abs(spin - 0.5) * 2) * 1.5}px)` : undefined,
              }}
            >
              {value}
            </div>
          );
        })}
      </div>
      {/* scanning beam while it guesses */}
      {frame >= spinAt && !found ? (
        <div style={{position: 'absolute', top: 0, bottom: 0, left: 28 * u + scan * gridW, width: 6 * u, background: colors.accent, boxShadow: `0 0 ${30 * u}px ${colors.accent}`, opacity: 0.8}} />
      ) : null}
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 20 * u, fontFamily: monoFamily, fontSize: 30 * u, color: '#ffffff'}}>
        <span style={{opacity: 0.6}}>d × G = public key?</span>
        <span style={{color: found ? colors.accent : '#ffffff', fontWeight: 700}}>
          TRY {String(n).padStart(3, '0')} / 255
        </span>
      </div>
    </div>
  );

  // padlock that springs open when the key is found
  const lock = (
    <div style={{position: 'relative', width: lockW, height: lockW * 1.25}}>
      <Padlock width={lockW} open={open} id="crack" shadow={`drop-shadow(0 ${24 * u}px ${40 * u}px ${alpha('#000000', 0.45)})`} />
      {found ? <GlitchBurst colorA={colors.accent} colorB={colors.accent2} seed="crack" /> : null}
    </div>
  );

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      {Array.from({length: 8}, (_, i) => (
        <Sfx key={i} name="tick" at={spinAt + Math.round(Math.pow(i / 8, 0.7) * (foundAt - spinAt))} i={i} volume={0.3} />
      ))}
      <Sfx name="impact" at={foundAt} volume={0.6} />
      <Sfx name="unlock" at={foundAt + 3} volume={0.7} />
      <Sfx name="stamp" at={foundAt + fpb} volume={0.7} />
      {scene.title ? (
        <div style={{position: 'absolute', top: height * (portrait ? 0.12 : 0.08), left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <KineticText text={scene.title} size={(portrait ? 100 : 84) * u} fitWidth={width * 0.8} delay={enter} />
        </div>
      ) : null}
      <div style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', gap: (portrait ? 50 : 110) * u, marginTop: (scene.title ? 80 : 0) * u}}>
        {grid}
        <div style={{position: 'relative'}}>
          {lock}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '58%',
              transform: `translate(-50%, -50%) rotate(-12deg) scale(${frame >= foundAt + fpb ? 2.2 - 1.2 * stamp : 0})`,
              opacity: Math.min(1, stamp * 2),
              padding: `${10 * u}px ${28 * u}px`,
              border: `${7 * u}px solid ${colors.accent2}`,
              borderRadius: 12 * u,
              color: colors.accent2,
              background: alpha('#ffffff', 0.92),
              fontFamily: displayFamily,
              fontWeight: displayMaxWeight,
              fontSize: 64 * u,
              letterSpacing: 2,
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
            }}
          >
            {scene.label ?? 'Key found'}
          </div>
          {found ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 16 * u, textAlign: 'center', fontFamily: monoFamily, fontWeight: 700, fontSize: 34 * u, color: colors.fg}}>
              d = 0x{hex(scene.value)} ({scene.value})
            </div>
          ) : null}
        </div>
      </div>
      {/* subtle sparks of noise in the plate's glow while guessing */}
      {frame >= spinAt && !found
        ? Array.from({length: 10}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: random(`cs${i}${frame >> 1}`) * width, top: random(`ct${i}${frame >> 1}`) * height, width: 4 * u, height: 4 * u, background: colors.accent, opacity: 0.35, borderRadius: 4}} />
          ))
        : null}
    </AbsoluteFill>
  );
};
