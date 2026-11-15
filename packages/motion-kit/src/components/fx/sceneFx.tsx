import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../../audio/Sfx';
import {useScene} from '../../lib/SceneContext';
import {alpha, clamp, isDark} from '../../lib/util';
import {Grade, LightLeak, SceneHits, Spot, TiltShift} from './hits';
import {BRoll} from './photos';
import type {Scene} from '../../types';
import {config} from '../../video.config';

// Per-scene effects any style can use (scene.zoom, scene.fx). They wrap the
// scene inside its Sequence, so they follow its timing and transitions.

// zoom: in = a slow push from wide to tight over the whole scene; out = the
// reverse, revealing the frame; punch = a quick snap in on the second beat
// that holds, for the line that lands.
export const SceneZoom: React.FC<{zoom: NonNullable<Scene['zoom']>; children: React.ReactNode}> = ({zoom, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {duration, enter, fpb} = useScene();
  const ease = {...clamp, easing: Easing.inOut(Easing.cubic)};
  let scale = 1;
  if (zoom === 'in') scale = interpolate(frame, [enter, duration], [1, 1.22], ease);
  else if (zoom === 'out') scale = interpolate(frame, [0, duration - fpb], [1.3, 1], ease);
  else {
    const at = enter + fpb * 2;
    // snap past the target, then settle (a few frames, like a camera op's punch)
    const t = (frame - at) / (fps * 0.25);
    scale = t <= 0 ? 1 : t >= 1 ? 1.16 : 1 + 0.16 * (1 - Math.exp(-6 * t) * Math.cos(t * Math.PI * 1.5));
  }
  return <AbsoluteFill style={{transform: `scale(${scale})`}}>{children}</AbsoluteFill>;
};

// glitch: real digital-error hits, not a shimmer. Each hit is ~8 frames:
// a one-frame invert flash, then the picture's red and cyan channels tear
// apart (an SVG colour-matrix split), rows shear sideways on a band-noise
// displacement, and hard data blocks flicker over it, all on a real glitch
// sound landing on the first frame. Hits fire when the content lands and
// at scene.glitchAt (beats from the scene start), so they sit on the words
// that earn them instead of on a timer.
const HIT = 8;
export const SceneGlitch: React.FC<{at?: number[]; children: React.ReactNode}> = ({at, children}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter, fpb, index} = useScene();
  const {accent, accent2} = config.brand.colors;
  const hits = [Math.round(enter), ...(at ?? []).map((b) => Math.round(b * fpb))];
  const live = hits.find((h) => frame >= h && frame < h + HIT);
  const t = live === undefined ? -1 : frame - live;
  // envelope: full on frames 0–3, then falls away
  const k = t < 0 ? 0 : t < 4 ? 1 : 1 - (t - 3) / (HIT - 3);
  const id = `glitch-${index}-${frame}`;
  const split = (12 + 26 * random(`gs${id}`)) * k * (width / 1080);
  const tear = (60 + 140 * random(`gt${id}`)) * k * (width / 1080);
  const seed = Math.floor(random(`gn${id}`) * 1000);
  return (
    <AbsoluteFill>
      {k > 0 ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={id} x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={split} dy={0} result="ro" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
            <feOffset in="gb" dx={-split} dy={0} result="gbo" />
            <feBlend in="ro" in2="gbo" mode="screen" result="rgb" />
            {/* band noise: constant along a row, so whole rows shear sideways */}
            <feTurbulence type="fractalNoise" baseFrequency={`0.0004 ${0.02 + 0.06 * random(`gf${id}`)}`} numOctaves={1} seed={seed} result="bands" />
            <feDisplacementMap in="rgb" in2="bands" scale={tear} xChannelSelector="R" yChannelSelector="A" />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{filter: k > 0 ? `url(#${id})${t < 1 ? ' invert(1)' : ''}` : undefined, transform: k > 0 ? `scale(${1 + 0.025 * k}) translateX(${(random(`gx${id}`) - 0.5) * 30 * k}px)` : undefined}}>
        {children}
      </AbsoluteFill>
      {k > 0 ? (
        <AbsoluteFill style={{pointerEvents: 'none'}}>
          {/* data blocks */}
          {Array.from({length: 7}, (_, i) => {
            const r = (n: string) => random(`gb${id}${i}${n}`);
            if (r('on') < 0.35) return null;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: r('x') * width * 0.9,
                  top: r('y') * height,
                  width: (0.08 + r('w') * 0.4) * width,
                  height: (4 + r('h') * 40) * (height / 1080),
                  background: [accent, accent2, '#ffffff', '#000000'][Math.floor(r('c') * 4)],
                  mixBlendMode: 'difference',
                  opacity: 0.9 * k,
                }}
              />
            );
          })}
          {/* scanlines during the hit */}
          <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 2px, transparent 2px, transparent 4px)', opacity: k}} />
        </AbsoluteFill>
      ) : null}
      {hits.map((h, i) => (
        <Sfx key={h} name="glitch" at={h} i={index + i} volume={0.75} />
      ))}
    </AbsoluteFill>
  );
};

// flames: fire licking up from the bottom edge, built from layered tongues
// whose heights flicker on a noise curve, plus embers drifting up. For "this
// is burning" beats: a breach, a shutdown, a price war.
export const Flames: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const {enter, duration} = useScene();
  const rise = interpolate(frame, [enter - 4, enter + 10, duration - 8, duration], [0, 1, 1, 0], clamp);
  const t = frame / fps;
  const N = 18;
  const tongue = (layer: number) =>
    Array.from({length: N}, (_, i) => {
      const x = (i / (N - 1)) * width;
      const flicker = 0.55 + 0.45 * Math.sin(t * (7 + layer * 2) + i * 1.7 + layer) * Math.sin(t * 3.1 + i * 0.6);
      const h = height * (0.16 + 0.14 * random(`fl${layer}${i}`)) * flicker * rise * (1 - layer * 0.28);
      return {x, h};
    });
  const path = (pts: {x: number; h: number}[]) => {
    let d = `M 0 ${height} `;
    pts.forEach((p, i) => {
      const prev = pts[i - 1];
      const mx = prev ? (prev.x + p.x) / 2 : p.x;
      d += prev ? `Q ${mx} ${height - prev.h * 0.35} ${p.x} ${height - p.h} ` : `L ${p.x} ${height - p.h} `;
    });
    return d + `L ${width} ${height} Z`;
  };
  const colors = ['#FF3B0A', '#FF8A00', '#FFD23F'];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* heat glow */}
      <AbsoluteFill style={{background: `linear-gradient(0deg, ${alpha('#FF5A00', 0.45 * rise)} 0%, transparent 38%)`}} />
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', filter: `blur(${width * 0.004}px)`}}>
        {colors.map((c, layer) => (
          <path key={layer} d={path(tongue(layer))} fill={c} opacity={0.85} />
        ))}
      </svg>
      {Array.from({length: 26}, (_, i) => {
        const life = fps * (1.6 + random(`em${i}`) * 1.4);
        const age = (frame + random(`eo${i}`) * life) % life;
        const p = age / life;
        const x = random(`ex${i}`) * width + Math.sin(t * 2 + i) * 30;
        const y = height * (1 - 0.12 - p * 0.6);
        const s = (3 + random(`es${i}`) * 5) * (width / 1080);
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, background: '#FFC24A', boxShadow: `0 0 ${s * 3}px #FF7A00`, opacity: rise * (1 - p) * 0.9}} />;
      })}
      <Sfx name="riser" at={enter - 4} volume={0.25} />
    </AbsoluteFill>
  );
};

// vhs: tape look. Scanlines, a rolling tracking band, colour bleed and a
// little vertical judder, with a REC-style timestamp in the corner.
export const Vhs: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const band = ((frame * 7) % (height * 1.4)) - height * 0.2;
  const judder = random(`vj${frame >> 2}`) < 0.08 ? (random(`vy${frame}`) - 0.5) * 10 : 0;
  const u = width / 1080;
  const secs = Math.floor(frame / fps);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `translateY(${judder}px)`, filter: 'saturate(1.25) contrast(1.08)'}}>
        {children}
        <AbsoluteFill style={{transform: 'translateX(5px)', mixBlendMode: 'screen', opacity: 0.35, filter: 'sepia(1) saturate(8) hue-rotate(-40deg) blur(1px)'}}>{children}</AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 5px)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: band, height: height * 0.06, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.18), rgba(255,255,255,0.05), transparent)', filter: 'blur(2px)', pointerEvents: 'none'}} />
      <div style={{position: 'absolute', right: width * 0.08, bottom: height * 0.08, fontFamily: 'monospace', fontWeight: 700, fontSize: 34 * u, color: '#ffffff', textShadow: '2px 0 #ff2a6d, -2px 0 #05d9e8', opacity: 0.85}}>
        <span style={{color: '#ff3b3b', opacity: frame % 30 < 18 ? 1 : 0}}>● </span>REC {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
      </div>
    </AbsoluteFill>
  );
};

// shake: handheld camera. Smooth low-frequency wobble with a slight roll.
export const Shake: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const a = width * 0.006;
  const x = (Math.sin(frame * 0.21) + Math.sin(frame * 0.53 + 1) * 0.5) * a;
  const y = (Math.sin(frame * 0.17 + 2) + Math.sin(frame * 0.61) * 0.4) * a;
  const r = Math.sin(frame * 0.11 + 0.5) * 0.35;
  return <AbsoluteFill style={{transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(1.03)`}}>{children}</AbsoluteFill>;
};

// letterbox: black cinema bars slide in, for the "serious" beat.
export const Letterbox: React.FC = () => {
  const frame = useCurrentFrame();
  const {height, width} = useVideoConfig();
  const {duration} = useScene();
  const k = interpolate(frame, [0, 10, duration - 8, duration], [0, 1, 1, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  // bars sized for 2.39:1 on landscape, a gentler crop on portrait
  const bar = (width > height ? (height - width / 2.39) / 2 : height * 0.09) * k;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000'}} />
    </AbsoluteFill>
  );
};

// flare: an anamorphic lens flare streaks across once, after the content lands.
export const Flare: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const {accent} = config.brand.colors;
  const t = interpolate(frame, [enter + fpb, enter + fpb * 4], [0, 1], clamp);
  if (t <= 0 || t >= 1) return null;
  const x = interpolate(t, [0, 1], [-0.2, 1.2]) * width;
  const y = height * 0.38;
  const glow = Math.sin(Math.PI * t);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: y - 3, height: 6, background: `linear-gradient(90deg, transparent, ${alpha('#9fd4ff', 0.9 * glow)} ${(x / width) * 100}%, transparent)`, filter: 'blur(2px)'}} />
      <div style={{position: 'absolute', left: x - 160, top: y - 160, width: 320, height: 320, borderRadius: 320, background: `radial-gradient(circle, ${alpha('#ffffff', 0.9 * glow)} 0%, ${alpha(accent, 0.45 * glow)} 30%, transparent 70%)`}} />
      {[0.55, 0.8, 1.15].map((k, i) => (
        <div key={i} style={{position: 'absolute', left: width - x * k - 40 * (i + 1), top: height - y * k - 40 * (i + 1), width: 80 * (i + 1), height: 80 * (i + 1), borderRadius: 999, border: `2px solid ${alpha(accent, 0.35 * glow)}`, background: alpha(accent, 0.08 * glow)}} />
      ))}
    </AbsoluteFill>
  );
};

// Wraps a scene in whichever of zoom / glitch / vhs / shake / flames /
// letterbox / flare it asks for.
export const SceneFx: React.FC<{scene: Scene; children: React.ReactNode}> = ({scene, children}) => {
  const fx = scene.fx ?? [];
  const {bg} = config.brand.colors;
  const {fpb} = useScene();
  const cues = (scene.sfx ?? []).map((c, i) => <Sfx key={`cue${i}`} name={c.name} at={Math.round(c.at * fpb)} i={i} volume={c.volume ?? 0.7} />);
  let out = scene.broll?.length ? (
    <AbsoluteFill>
      <BRoll images={scene.broll} bg={bg} dark={isDark(bg)} />
      {children}
    </AbsoluteFill>
  ) : (
    <>{children}</>
  );
  if (scene.zoom) out = <SceneZoom zoom={scene.zoom}>{out}</SceneZoom>;
  if (fx.includes('shake')) out = <Shake>{out}</Shake>;
  if (fx.includes('glitch')) out = <SceneGlitch at={scene.glitchAt}>{out}</SceneGlitch>;
  if (fx.includes('vhs')) out = <Vhs>{out}</Vhs>;
  if (fx.includes('tiltShift')) out = <TiltShift>{out}</TiltShift>;
  if (scene.grade) out = <Grade grade={scene.grade}>{out}</Grade>;
  if (scene.hits?.length) out = <SceneHits hits={scene.hits}>{out}</SceneHits>;
  const overlays = (['flames', 'letterbox', 'flare', 'leak', 'spotlight'] as const).some((f) => fx.includes(f));
  if (!overlays) return cues.length ? (<AbsoluteFill>{out}{cues}</AbsoluteFill>) : out;
  return (
    <AbsoluteFill>
      {out}
      {cues}
      {fx.includes('spotlight') ? <Spot /> : null}
      {fx.includes('leak') ? <LightLeak /> : null}
      {fx.includes('flames') ? <Flames /> : null}
      {fx.includes('flare') ? <Flare /> : null}
      {fx.includes('letterbox') ? <Letterbox /> : null}
    </AbsoluteFill>
  );
};
