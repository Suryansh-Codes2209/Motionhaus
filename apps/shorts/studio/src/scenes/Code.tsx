import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {monoFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, isDark, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

type Seg = {text: string; color: string; bold?: boolean};

const KEYWORDS =
  /^(const|let|var|function|return|import|from|export|default|await|async|if|else|for|while|new|class|def|type|interface|extends|true|false|null|undefined|npm|npx|pip|git|curl)$/;

// Tiny highlighter: good enough for a 6-line snippet, no dependency.
// The window is always dark (#0d0d12), so on a light palette (chalk, toybox,
// newsprint) the code takes light inks instead of the palette's dark text.
const onPanel = () => {
  const c = config.brand.colors;
  return isDark(c.bg) ? {fg: c.fg, muted: c.muted} : {fg: '#E8EAF2', muted: '#8E94A8'};
};

const highlight = (line: string): Seg[] => {
  const {accent, accent2} = config.brand.colors;
  const {fg, muted} = onPanel();
  const segs: Seg[] = [];
  const re = /(\/\/.*$|#.*$)|("[^"]*"?|'[^']*'?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|(\s+|.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1]) segs.push({text: m[1], color: muted});
    else if (m[2]) segs.push({text: m[2], color: accent2});
    else if (m[3]) segs.push({text: m[3], color: accent2});
    else if (m[4]) segs.push({text: m[4], color: fg, bold: true});
    else if (m[5]) segs.push({text: m[5], color: KEYWORDS.test(m[5]) ? accent : alpha(fg, 0.85)});
    else segs.push({text: m[6], color: alpha(fg, 0.6)});
  }
  return segs;
};

// A code editor (or terminal) that types itself out on the beat grid, with a
// blinking block cursor, inside a window that tilts in and slowly pushes.
export const Code: React.FC<{scene: SceneOf<'code'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {enter, fpb, duration} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const terminal = !!scene.terminal;

  const lines = scene.code.replace(/\s+$/, '').split('\n');
  // Terminal output prints almost instantly; everything else is typed.
  const cost = lines.map((l) => (terminal && !l.startsWith('$') ? Math.ceil(l.length * 0.12) + 2 : l.length + 3));
  const total = cost.reduce((a, b) => a + b, 0);
  const typeStart = enter + fpb * 0.5;
  // ~3 chars/frame, but always finished two beats before the cut.
  const typeEnd = Math.min(duration - fpb * 2, typeStart + total / 3);
  const budget = interpolate(frame, [typeStart, typeEnd], [0, total], clamp);
  const typing = frame >= typeStart && frame < typeEnd;

  const fw = portrait ? width * 0.9 : Math.min(width * 0.7, 1300 * u);
  const longest = Math.max(...lines.map((l) => l.length), 20);
  const gutter = terminal ? 0 : 3.5;
  const fontSize = Math.min(34 * u, (fw - 100 * u) / ((longest + gutter) * 0.62));

  const s = spring({frame: frame - enter, fps, config: {damping: 18, stiffness: 80}});
  const rotX = interpolate(s, [0, 1], [26, 6]);
  const rotY = interpolate(s, [0, 1], [18, -4]) + interpolate(frame, [0, duration], [0, 6]);
  const push = interpolate(frame, [enter, duration], [0.86, 1.02]);

  let left = budget;
  let cursorLine = 0;
  let cursorCol = 0;
  const rendered = lines.map((line, i) => {
    const take = Math.max(0, Math.min(1, left / cost[i]));
    const chars = Math.round(take * line.length);
    if (left > 0) {
      cursorLine = i;
      cursorCol = chars;
    }
    left -= cost[i];
    return line.slice(0, chars);
  });
  const lineStarts = lines.map((_, i) => typeStart + (cost.slice(0, i).reduce((a, b) => a + b, 0) / total) * (typeEnd - typeStart));
  const blink = typing || Math.floor(frame / 8) % 2 === 0;

  const bar = 52 * u;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 50 * u}}>
      {lineStarts.map((t, i) =>
        rendered[i] || i === 0 ? <Sfx key={i} name="tick" at={t} i={i} volume={0.3} /> : null,
      )}
      {scene.caption ? (
        <KineticText text={scene.caption} size={64 * u} fitWidth={width * 0.88} delay={enter + 4} />
      ) : null}
      <div style={{perspective: 2400 * u}}>
        <div
          style={{
            width: fw,
            borderRadius: 20 * u,
            overflow: 'hidden',
            background: '#0d0d12',
            boxShadow: `0 ${50 * u}px ${140 * u}px rgba(0,0,0,0.55), 0 0 0 ${1.5 * u}px ${alpha(colors.fg, 0.12)}, 0 0 ${120 * u}px ${alpha(colors.accent, 0.25)}`,
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${push})`,
            opacity: Math.min(1, s * 2),
          }}
        >
          <div style={{height: bar, display: 'flex', alignItems: 'center', gap: 9 * u, padding: `0 ${20 * u}px`, background: '#16161d'}}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <div key={c} style={{width: 13 * u, height: 13 * u, borderRadius: '50%', background: c}} />
            ))}
            <div
              style={{
                marginLeft: 18 * u,
                padding: `${7 * u}px ${18 * u}px`,
                borderRadius: 8 * u,
                background: '#0d0d12',
                color: '#c9c9d4',
                fontFamily: monoFamily,
                fontSize: 17 * u,
              }}
            >
              {scene.filename ?? (terminal ? 'zsh' : 'index.ts')}
            </div>
          </div>
          <div
            style={{
              padding: `${30 * u}px ${36 * u}px ${40 * u}px`,
              fontFamily: monoFamily,
              fontSize,
              lineHeight: 1.65,
              whiteSpace: 'pre',
              minHeight: lines.length * fontSize * 1.65,
            }}
          >
            {rendered.map((text, i) => {
              const isCmd = terminal && lines[i].startsWith('$');
              const segs = terminal && !isCmd ? [{text, color: onPanel().muted} as Seg] : highlight(isCmd ? text.slice(1) : text);
              return (
                <div key={i} style={{display: 'flex'}}>
                  {terminal ? null : (
                    <span style={{width: `${gutter}ch`, color: alpha(onPanel().fg, 0.25), flexShrink: 0}}>{i + 1}</span>
                  )}
                  <span>
                    {isCmd && text ? <span style={{color: colors.accent, fontWeight: 700}}>$</span> : null}
                    {segs.map((sg, j) => (
                      <span key={j} style={{color: sg.color, fontWeight: sg.bold ? 700 : 400}}>
                        {sg.text}
                      </span>
                    ))}
                    {i === cursorLine && frame >= typeStart ? (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '0.6em',
                          height: '1.15em',
                          verticalAlign: 'text-bottom',
                          marginLeft: cursorCol === 0 ? 0 : 2 * u,
                          background: colors.accent,
                          opacity: blink ? 1 : 0,
                        }}
                      />
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
