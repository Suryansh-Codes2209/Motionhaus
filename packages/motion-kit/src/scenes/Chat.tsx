import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {emphasisStyle, KineticText, tokenize} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, isDark, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill} from '../styles';
import {config} from '../video.config';

// AI product demo: the prompt types into the composer, sends with a pop, the
// user bubble flies up, "thinking" dots pulse, then the answer streams in.
export const Chat: React.FC<{scene: SceneOf<'chat'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb, duration} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors, name, logo} = config.brand;
  const dark = isDark(colors.bg);

  const pw = portrait ? width * 0.9 : Math.min(width * 0.58, 1100 * u);
  const ph = portrait ? height * 0.6 : height * (scene.caption ? 0.6 : 0.72);
  const typeStart = enter + fpb * 0.4;
  const typeDur = Math.min(fpb * 2.5, Math.max(fpb, scene.prompt.length / 1.5));
  const send = typeStart + typeDur + 4;
  const answerAt = send + fpb;
  const typed = scene.prompt.slice(0, Math.round(interpolate(frame, [typeStart, typeStart + typeDur], [0, scene.prompt.length], clamp)));
  const sent = frame >= send;
  const words = tokenize(scene.answer);
  const wordGap = Math.max(1, Math.min(2.5, (duration - fpb - answerAt) / Math.max(1, words.length)));

  const s = spring({frame: frame - enter, fps, config: {damping: 18, stiffness: 90}});
  const bubble = spring({frame: frame - send, fps, config: {damping: 14, stiffness: 160}});
  const reply = spring({frame: frame - answerAt + 4, fps, config: {damping: 16, stiffness: 140}});
  const panel = dark ? alpha(colors.fg, 0.06) : 'rgba(255,255,255,0.78)';
  const textSize = Math.min(34 * u, pw / 30);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 50 * u}}>
      <Sfx name="pop" at={send} volume={0.6} />
      <Sfx name="tick" at={answerAt} volume={0.4} />
      {scene.caption ? <KineticText text={scene.caption} size={64 * u} fitWidth={width * 0.88} delay={enter + 4} /> : null}
      <div style={{perspective: 2400 * u}}>
        <div
          style={{
            width: pw,
            height: ph,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 32 * u,
            overflow: 'hidden',
            background: panel,
            border: `${1.5 * u}px solid ${alpha(colors.fg, dark ? 0.14 : 0.1)}`,
            backdropFilter: 'blur(24px)',
            boxShadow: `0 ${40 * u}px ${120 * u}px rgba(0,0,0,${dark ? 0.45 : 0.15}), 0 0 ${140 * u}px ${alpha(colors.accent, 0.2)}`,
            transform: `translateY(${(1 - s) * height * 0.3}px) rotateX(${(1 - s) * 20}deg) scale(${0.9 + 0.1 * s})`,
            opacity: Math.min(1, s * 2),
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 14 * u, padding: `${24 * u}px ${30 * u}px`, borderBottom: `${1.5 * u}px solid ${alpha(colors.fg, 0.08)}`}}>
            <div style={{width: 14 * u, height: 14 * u, borderRadius: '50%', background: colors.accent2, boxShadow: `0 0 ${14 * u}px ${colors.accent2}`}} />
            <div style={{fontFamily: displayFamily, fontWeight: Math.min(700, displayMaxWeight), fontSize: 28 * u, color: colors.fg}}>{name}</div>
          </div>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 26 * u, padding: 30 * u}}>
            {sent ? (
              <div
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '80%',
                  padding: `${18 * u}px ${26 * u}px`,
                  borderRadius: `${26 * u}px ${26 * u}px ${6 * u}px ${26 * u}px`,
                  background: accentFill(120),
                  color: '#fff',
                  fontFamily: bodyFamily,
                  fontSize: textSize,
                  lineHeight: 1.35,
                  transform: `translateY(${(1 - bubble) * 120 * u}px) scale(${0.8 + 0.2 * bubble})`,
                  transformOrigin: 'right bottom',
                  opacity: bubble,
                }}
              >
                {scene.prompt}
              </div>
            ) : null}
            {frame >= send + 6 ? (
              <div style={{display: 'flex', gap: 18 * u, alignItems: 'flex-start', opacity: Math.min(1, (frame - send - 6) / 5)}}>
                <div
                  style={{
                    width: 56 * u,
                    height: 56 * u,
                    flexShrink: 0,
                    borderRadius: 16 * u,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: logo ? alpha(colors.fg, 0.08) : accentFill(135),
                    color: '#fff',
                    fontFamily: displayFamily,
                    fontWeight: 800,
                    fontSize: 28 * u,
                  }}
                >
                  {logo ? <Img src={staticFile(logo)} style={{width: '70%', height: '70%', objectFit: 'contain'}} /> : name[0]}
                </div>
                {frame < answerAt ? (
                  <div style={{display: 'flex', gap: 9 * u, padding: `${22 * u}px 0`}}>
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        style={{
                          width: 13 * u,
                          height: 13 * u,
                          borderRadius: '50%',
                          background: colors.muted,
                          opacity: 0.35 + 0.65 * Math.max(0, Math.sin((frame - d * 3) / 3)),
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: bodyFamily,
                      fontSize: textSize,
                      lineHeight: 1.45,
                      color: colors.fg,
                      transform: `translateY(${(1 - reply) * 20 * u}px)`,
                      paddingTop: 8 * u,
                    }}
                  >
                    {words.map((w, i) => {
                      const o = interpolate(frame, [answerAt + i * wordGap, answerAt + i * wordGap + 5], [0, 1], clamp);
                      return (
                        <span
                          key={i}
                          style={{
                            opacity: o,
                            filter: `blur(${(1 - o) * 6}px)`,
                            ...(w.em ? {fontWeight: 700, ...emphasisStyle(frame, 0)} : {}),
                          }}
                        >
                          {w.word}{' '}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div style={{padding: `0 ${30 * u}px ${30 * u}px`}}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16 * u,
                padding: `${16 * u}px ${16 * u}px ${16 * u}px ${28 * u}px`,
                borderRadius: 999,
                background: alpha(colors.fg, dark ? 0.07 : 0.05),
                border: `${1.5 * u}px solid ${alpha(colors.fg, frame >= typeStart && !sent ? 0.3 : 0.1)}`,
              }}
            >
              <div style={{flex: 1, fontFamily: bodyFamily, fontSize: textSize * 0.9, color: sent || !typed ? colors.muted : colors.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {sent || !typed ? 'Ask anything…' : typed}
                {!sent && typed && Math.floor(frame / 8) % 2 === 0 ? <span style={{color: colors.accent}}>|</span> : null}
              </div>
              <div
                style={{
                  width: 54 * u,
                  height: 54 * u,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: accentFill(135),
                  color: '#fff',
                  fontSize: 28 * u,
                  transform: `scale(${interpolate(frame, [send - 3, send, send + 5], [1, 0.8, 1], clamp)})`,
                }}
              >
                ↑
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
