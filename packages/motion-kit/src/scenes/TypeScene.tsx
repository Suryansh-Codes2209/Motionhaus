import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText, tokenize} from '../components/KineticText';
import {keywordOf, MotionText, moveStyle} from '../components/fx/moves';
import {labelFamily, displayFamily, displayMaxWeight, displayWidthScale, IMPACT_WIDTH, impactFamily, monoFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill, onAccent} from '../styles';
import {config} from '../video.config';

const gradientText = (): React.CSSProperties => ({
  backgroundImage: `linear-gradient(100deg, ${config.brand.colors.accent}, ${config.brand.colors.accent2})`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
});

// One word per half-beat, filling the frame; emphasized words flip to a solid
// accent plate. Then the whole line settles together.
const Slam: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const words = tokenize(text);
  const step = fpb * 0.5;
  const full = enter + words.length * step + step;

  if (frame >= full) {
    return (
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 90 * u}}>
        <KineticText text={text} size={150 * u} fitWidth={width * 1.5} delay={full} stagger={1} weight={800} />
      </AbsoluteFill>
    );
  }
  const k = Math.min(words.length - 1, Math.max(0, Math.floor((frame - enter) / step)));
  const w = words[k];
  const local = frame - (enter + k * step);
  const scale = interpolate(local, [0, 4, step * 2], [1.6, 1, 1.06], clamp);
  const blur = interpolate(local, [0, 3], [12, 0], clamp);
  const size = Math.min(380 * u, (width * 0.9) / Math.max(1, w.word.length * 0.6 * displayWidthScale));

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: frame >= enter && w.em ? accentFill(120) : undefined,
      }}
    >
      {words.map((_, i) => (
        <Sfx key={i} name="tick" at={enter + i * step} i={i} volume={0.55} />
      ))}
      {frame >= enter ? (
        <div
          style={{
            fontFamily: displayFamily,
            fontWeight: Math.min(900, displayMaxWeight),
            fontSize: size,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            color: w.em ? colors.bg : colors.fg,
            transform: `scale(${scale})`,
            filter: `blur(${blur}px)`,
          }}
        >
          {w.word}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';

// Characters cycle through random glyphs and lock in left to right.
const Scramble: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const words = tokenize(text);
  const chars: {c: string; em: boolean}[] = [];
  words.forEach((w, i) => {
    if (i > 0) chars.push({c: ' ', em: false});
    for (const c of w.word) chars.push({c, em: w.em});
  });
  const size = Math.min(150 * u, (width * 0.88) / Math.max(1, chars.length * 0.62));
  const lockAt = (j: number) => enter + fpb * 0.75 + j * 1.3;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Sfx name="tick" at={enter} volume={0.5} />
      <Sfx name="pop" at={lockAt(chars.length - 1)} volume={0.5} />
      <div
        style={{
          fontFamily: monoFamily,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: '-0.02em',
          whiteSpace: 'pre',
          color: colors.fg,
        }}
      >
        {chars.map(({c, em}, j) => {
          const shown = frame >= enter + j * 0.6;
          const locked = frame >= lockAt(j);
          const glyph =
            c === ' ' || locked
              ? c
              : GLYPHS[Math.floor(random(`g${j}-${Math.floor(frame / 2)}`) * GLYPHS.length)];
          return (
            <span
              key={j}
              style={{
                opacity: shown ? 1 : 0,
                ...(locked && em ? gradientText() : {}),
                color: locked ? (em ? 'transparent' : colors.fg) : alpha(colors.accent, 0.9),
              }}
            >
              {glyph}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Repeated rows of outlined type drifting in alternating directions; the
// middle row is solid. A classic poster/showreel look.
const Stack: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {fps, height, width} = useVideoConfig();
  const {enter} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const plain = text.replace(/\*/g, '').toUpperCase();
  const rows = portrait ? 7 : 5;
  const mid = Math.floor(rows / 2);
  const size = height / (rows * 1.02);
  const run = new Array(6).fill(`${plain} · `).join('');

  return (
    <AbsoluteFill style={{justifyContent: 'center', overflow: 'hidden'}}>
      <Sfx name="pop" at={enter + 2 * mid} volume={0.5} />
      {new Array(rows).fill(0).map((_, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        const s = spring({frame: frame - enter - Math.abs(i - mid) * 2, fps, config: {damping: 20, stiffness: 90}});
        const x = -width * 0.5 + dir * (frame * 2.4 * u) - dir * (1 - s) * width;
        const solid = i === mid;
        return (
          <div
            key={i}
            style={{
              fontFamily: displayFamily,
              fontWeight: Math.min(900, displayMaxWeight),
              fontSize: size,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              whiteSpace: 'nowrap',
              width: 'max-content', // so the gradient clip covers the whole run
              transform: `translateX(${x}px)`,
              opacity: s,
              ...(solid
                ? gradientText()
                : {color: 'transparent', WebkitTextStroke: `${2 * u}px ${alpha(colors.fg, 0.35)}`}),
            }}
          >
            {run}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// build: the words land on shrinking gaps, each bigger than the last, so the
// line accelerates into its final word.
const Build: React.FC<{text: string}> = ({text}) => {
  const {width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const n = tokenize(text).length;
  const gaps = [fpb * 0.9, fpb * 0.6, fpb * 0.4, fpb * 0.3].map(Math.round);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 80 * u}}>
      {Array.from({length: n}, (_, i) => (
        <Sfx key={i} name={i === n - 1 ? 'impact' : 'tick'} at={enter + gaps.slice(0, i).reduce((a, b) => a + b, 0) + (i > gaps.length ? (i - gaps.length) * gaps[gaps.length - 1] : 0)} i={i} volume={i === n - 1 ? 0.6 : 0.5} />
      ))}
      <MotionText text={text} size={120 * u} move="pop" at={enter} gaps={gaps} grow={1.16} dur={7} fitWidth={width * 1.1} loop="breathe" />
    </AbsoluteFill>
  );
};

// echo: the keyword repeated down the frame as outlines that rise in and
// settle on one solid copy; the full line sits under the stack.
const EchoStack: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {accent} = config.brand.colors;
  const word = keywordOf(text).toUpperCase();
  const rows = portrait ? 6 : 4;
  const size = Math.min(height * (portrait ? 0.085 : 0.16), (width * 0.9) / Math.max(1, word.length * 0.55 * IMPACT_WIDTH));
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 36 * u, paddingBottom: portrait ? height * 0.2 : 0}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {Array.from({length: rows}, (_, r) => {
          const solid = r === rows - 1;
          const at = enter + r * 2;
          return (
            <div key={r} style={{fontFamily: impactFamily, fontSize: size, lineHeight: 0.98, letterSpacing: '0.01em', ...(solid ? {color: accent, textShadow: `0 0 ${40 * u}px ${alpha(accent, 0.55)}`} : {color: 'transparent', WebkitTextStroke: `${2.5 * u}px ${alpha(accent, 0.25 + 0.1 * r)}`}), ...moveStyle('rise', (frame - at) / 8, 'expo')}}>
              {word}
              <Sfx name="tick" at={at} i={r} volume={0.3} />
            </div>
          );
        })}
      </div>
      <Sfx name="impact" at={enter + rows * 2 + 4} volume={0.55} />
      <KineticText text={text} size={70 * u} fitWidth={width * 1.5} delay={enter + rows * 2 + 6} weight={700} />
    </AbsoluteFill>
  );
};

// boxed: a plain line where the *emphasised* word sits in a solid box that
// pops in after the line, like a highlighter block.
const Boxed: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {fg} = config.brand.colors;
  const tokens = tokenize(text);
  const size = Math.min(150 * u, (width * 1.7) / Math.max(1, text.length * 0.55 * displayWidthScale));
  const boxAt = enter + tokens.length * 3 + Math.round(fpb * 0.5);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 80 * u}}>
      <Sfx name="pop" at={boxAt} volume={0.6} />
      <div style={{fontFamily: displayFamily, fontWeight: Math.min(800, displayMaxWeight), fontSize: size, lineHeight: 1.22, letterSpacing: '-0.03em', color: fg, textAlign: 'center'}}>
        {tokens.map((t, i) => {
          const css = moveStyle('rise', (frame - enter - i * 3) / 9);
          const k = t.em ? moveStyle('pop', (frame - boxAt) / 8) : null;
          return (
            <React.Fragment key={i}>
              <span style={{display: 'inline-block', position: 'relative', padding: t.em ? '0 0.18em' : undefined, color: t.em && frame >= boxAt ? onAccent() : fg, ...css}}>
                {t.em ? <span style={{position: 'absolute', inset: '0.04em -0.02em', background: accentFill(100), borderRadius: 0.12 * size, zIndex: -1, transform: 'rotate(-1.5deg)', ...k, ...(k?.transform ? {transform: `rotate(-1.5deg) ${k.transform}`} : {})}} /> : null}
                {t.word}
              </span>{' '}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// offset: one or two words, solid, sitting on an offset outline copy of
// themselves (a print mis-registration), popping on the beat.
const Offset: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {fg, accent} = config.brand.colors;
  const plain = text.replace(/\*/g, '').toUpperCase();
  const size = Math.min(height * 0.3, (width * 0.88) / Math.max(1, plain.length * 0.55 * IMPACT_WIDTH));
  const css = moveStyle('pop', (frame - enter) / 8);
  const d = interpolate(frame, [enter + 3, enter + 10], [0, 0.07 * size], clamp);
  const beat = 1 + 0.04 * Math.exp(-(((frame - enter) % fpb) / fpb) * 5);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingBottom: height > width ? height * 0.14 : 0}}>
      <Sfx name="impact" at={enter} volume={0.6} />
      <div style={{position: 'relative', fontFamily: impactFamily, fontSize: size, lineHeight: 1, letterSpacing: '0.01em', textAlign: 'center', ...css, transform: `${css.transform ?? ''} scale(${beat}) rotate(-3deg)`}}>
        <div style={{position: 'absolute', inset: 0, color: 'transparent', WebkitTextStroke: `${4 * u}px ${accent}`, transform: `translate(${d}px, ${d}px)`}}>{plain}</div>
        <div style={{position: 'relative', color: fg}}>{plain}</div>
      </div>
    </AbsoluteFill>
  );
};

// wall: the keyword tiled into a wall of rows behind the full line; one row
// is solid accent, the rest ink, each sliding in from alternate sides.
const Wall: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter} = useScene();
  const u = useUnit();
  const {fg, bg, accent} = config.brand.colors;
  const word = keywordOf(text).toUpperCase();
  const rows = 6;
  const size = height / (rows * 0.98);
  const run = new Array(8).fill(word).join(' ');
  const plateAt = enter + rows * 2 + 4;
  return (
    <AbsoluteFill style={{overflow: 'hidden', justifyContent: 'center'}}>
      {Array.from({length: rows}, (_, r) => {
        const dir = r % 2 ? 1 : -1;
        const p = EASE_OUT(Math.min(1, Math.max(0, (frame - enter - r * 2) / 10)));
        return (
          <div key={r} style={{fontFamily: impactFamily, fontSize: size, lineHeight: 0.98, whiteSpace: 'nowrap', width: 'max-content', color: r === 2 ? accent : alpha(fg, 0.13), transform: `translateX(${-width * 0.4 + dir * (1 - p) * width - dir * frame * 1.2 * u}px)`}}>
            {run}
          </div>
        );
      })}
      <Sfx name="whoosh-2" at={enter} volume={0.4} />
      <Sfx name="stamp" at={plateAt} volume={0.6} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70 * u}}>
        <div style={{background: bg, padding: `${26 * u}px ${40 * u}px`, borderRadius: 18 * u, boxShadow: `0 ${24 * u}px ${70 * u}px rgba(0,0,0,0.5)`, ...moveStyle('slam', (frame - plateAt) / 7)}}>
          <KineticText text={text} size={96 * u} fitWidth={width * 1.3} delay={plateAt} stagger={1} weight={800} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

// window (a mask edit): the keyword set as tall as the frame allows, its
// letters a window onto a photo or a clip that keeps moving inside them. The
// frame around the letters is black, so the footage only exists in the word.
// The rest of the line lands under it.
const Window: React.FC<{scene: SceneOf<'type'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const {enter, duration} = useScene();
  const u = useUnit();
  const word = keywordOf(scene.text).toUpperCase();
  const rest = scene.text.replace(/\*[^*]+\*/, '').replace(/\s+/g, ' ').trim();
  const size = Math.min(height * 0.62, (width * 0.9) / Math.max(1, word.length * 0.5));
  // from frame 0, not `enter`: a mask transition into this scene needs the word already there
  const s = spring({frame: frame + 6, fps, config: {damping: 16, stiffness: 120}});
  const push = interpolate(frame, [0, duration], [1.25, 1.02], clamp);
  const drift = interpolate(frame, [0, duration], [-3, 3]);
  const id = `type-window-${word.replace(/[^A-Z0-9]/g, '')}`;
  const cy = height * (rest ? 0.44 : 0.5);
  const fill: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};
  return (
    <AbsoluteFill style={{backgroundColor: '#050505', overflow: 'hidden'}}>
      <Sfx name="impact" at={enter} volume={0.5} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <clipPath id={id} clipPathUnits="userSpaceOnUse">
          <text x={width / 2} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily={impactFamily} fontSize={size} transform={`translate(${width / 2} ${cy}) scale(${0.7 + 0.3 * s + frame * 0.0006}) translate(${-width / 2} ${-cy})`}>
            {word}
          </text>
        </clipPath>
      </svg>
      <AbsoluteFill style={{clipPath: `url(#${id})`, opacity: Math.min(1, s * 2)}}>
        <AbsoluteFill style={{transform: `scale(${push}) translateX(${drift}%)`, filter: 'saturate(1.2) contrast(1.08) brightness(1.12)'}}>
          {scene.video ? <OffthreadVideo src={staticFile(scene.video)} muted style={fill} /> : scene.image ? <Img src={staticFile(scene.image)} style={fill} /> : <AbsoluteFill style={{background: accentFill(120)}} />}
        </AbsoluteFill>
      </AbsoluteFill>
      {rest ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: cy + size * 0.5 + 10 * u, display: 'flex', justifyContent: 'center'}}>
          <KineticText text={rest} size={76 * u} fitWidth={width * 0.84} delay={enter + 8} weight={800} color="#ffffff" />
        </div>
      ) : null}
      {scene.credit ? (
        <div style={{position: 'absolute', left: width * 0.08, bottom: height * 0.07, fontFamily: labelFamily, fontSize: 20 * u, color: alpha('#ffffff', 0.7)}}>{scene.credit}</div>
      ) : null}
    </AbsoluteFill>
  );
};

export const TypeScene: React.FC<{scene: SceneOf<'type'>}> = ({scene}) => {
  switch (scene.style ?? 'slam') {
    case 'scramble':
      return <Scramble text={scene.text} />;
    case 'stack':
      return <Stack text={scene.text} />;
    case 'build':
      return <Build text={scene.text} />;
    case 'echo':
      return <EchoStack text={scene.text} />;
    case 'boxed':
      return <Boxed text={scene.text} />;
    case 'offset':
      return <Offset text={scene.text} />;
    case 'wall':
      return <Wall text={scene.text} />;
    case 'window':
      return <Window scene={scene} />;
    default:
      return <Slam text={scene.text} />;
  }
};
