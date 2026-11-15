import React, {useEffect, useRef} from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {Space, type SpaceItem} from '../components/fx/space';
import {displayFamily, impactFamily, labelFamily, monoFamily, serifItalicFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// 3D scenes on the Space stage (components/fx/space): real depth, a moving
// camera and depth of field. They always play on a deep, dark stage, whatever
// the palette, so the planes read as lit objects in space.
//   swarm:   sheets multiply through space (1 → 4 → 32 → …) as the camera
//            pulls back; words flash at different depths; a counter runs.
//   gallery: the episode's images as tilted cards strung out in depth; the
//            camera flies from one to the next, pulling focus each time.
//   vortex:  thousands of points spiral into a tilted disc around a word or
//            an image, then the centre flares.

const STAGE = '#04050d';
const PAPER = ['#f4f2ea', '#ecebe4', '#fff8d6', '#e9eef7', '#f6eef0'];
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const Stage: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {accent, accent2} = config.brand.colors;
  return (
    <AbsoluteFill style={{backgroundColor: STAGE, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${alpha(accent2, 0.16)}, transparent 70%), radial-gradient(ellipse 50% 40% at 70% 80%, ${alpha(accent, 0.1)}, transparent 70%)`}} />
      {children}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

// A sheet of paper with faint lines of "text" and one coloured mark.
const Sheet: React.FC<{i: number; image?: string}> = ({i, image}) => {
  const tint = PAPER[i % PAPER.length];
  const {accent, accent2} = config.brand.colors;
  if (image) {
    return (
      <div style={{width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden', background: '#111', boxShadow: '0 30px 80px rgba(0,0,0,0.6)'}}>
        <Img src={staticFile(image)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 6,
        backgroundColor: tint,
        backgroundImage: `linear-gradient(${i % 2 ? accent : accent2}, ${i % 2 ? accent : accent2}), repeating-linear-gradient(180deg, rgba(20,20,30,0.34) 0 5px, transparent 5px 19px)`,
        backgroundSize: `${28 + (i % 4) * 9}% 9%, 76% 62%`,
        backgroundPosition: `12% ${14 + (i % 3) * 4}%, 50% 78%`,
        backgroundRepeat: 'no-repeat',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}
    />
  );
};

const Swarm: React.FC<{scene: SceneOf<'space'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter, fpb, duration, index} = useScene();
  const u = useUnit();
  const N = Math.min(320, Math.max(40, scene.count ?? 220));
  const t = Math.max(0, frame - enter);
  // The swarm fills over the first 60% of the scene, doubling as it goes.
  const fill = smooth(t / Math.max(1, (duration - enter) * 0.6));
  const shown = Math.max(1, Math.floor(Math.pow(N, fill)));
  const images = scene.images ?? [];
  const words = scene.words ?? [];

  const items: SpaceItem[] = [];
  for (let i = 0; i < shown; i++) {
    // early sheets sit near the centre of the frame and the focal plane; later ones spread out
    const spread = 0.05 + 0.95 * Math.pow(i / N, 0.45);
    const born = Math.log(i + 1) / Math.log(N); // when (0..1 of fill) this sheet appeared
    const age = Math.max(0, fill - born) * 6 + (t / fpb) * 0.05;
    const pop = smooth((fill - born) * 14 + (i === 0 ? 1 : 0));
    const img = i < images.length * 2 && i % 2 === 0 ? images[(i / 2) % images.length] : undefined;
    const w = img ? 520 : 300;
    items.push({
      key: `s${i}`,
      x: (random(`sx${i}`) - 0.5) * 5200 * spread,
      y: (random(`sy${i}`) - 0.5) * 3000 * spread - age * 30,
      z: 900 + random(`sz${i}`) * 4600 * spread,
      w,
      h: img ? 330 : 400,
      rx: (random(`srx${i}`) - 0.5) * 70 + Math.sin(age * 0.9 + i) * 14,
      ry: (random(`sry${i}`) - 0.5) * 80 + age * (random(`sv${i}`) - 0.5) * 60,
      rz: (random(`srz${i}`) - 0.5) * 40,
      opacity: pop,
      scale: 0.7 + 0.3 * pop,
      node: <Sheet i={i} image={img} />,
    });
  }
  // words hang in the space at different depths, one per beat; they are drawn
  // on their own stage above the sheets so a passing page never hides one
  const wordItems: SpaceItem[] = [];
  words.forEach((word, i) => {
    const at = fpb * (0.6 + i * (Math.max(2, (duration - enter) / fpb - 4) / Math.max(1, words.length)));
    const life = (t - at) / (fpb * 2.2);
    if (life <= 0 || life >= 1) return;
    const serif = i % 2 === 0;
    wordItems.push({
      key: `w${i}`,
      x: (random(`wx${i}`) - 0.5) * 700,
      y: (random(`wy${i}`) - 0.5) * 700,
      z: 1500 + random(`wz${i}`) * 500 - life * 420,
      w: 1200,
      h: 300,
      opacity: Math.min(1, life * 6) * Math.min(1, (1 - life) * 4),
      node: (
        <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif ? serifItalicFamily : impactFamily, fontSize: serif ? 210 : 190, color: '#ffffff', textShadow: '0 10px 60px rgba(0,0,0,0.8)', whiteSpace: 'nowrap'}}>{word}</div>
      ),
    });
  });

  const pull = interpolate(t, [0, duration - enter], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const camera = {x: Math.sin(t / fpb / 5) * 260, y: -pull * 120, z: 300 - pull * 2300, focus: 1300 + pull * 2100, roll: Math.sin(t / fpb / 7) * 2.2, aperture: 15};
  const total = scene.total ?? N;
  const counter = Math.round(Math.pow(total, fill));
  const titleAt = enter + Math.round((duration - enter) * 0.62);

  return (
    <Stage>
      <Sfx name="riser" at={enter} i={index} volume={0.5} />
      <Space items={items} camera={camera} />
      <Space items={wordItems} camera={{...camera, aperture: 5}} />
      {scene.title && frame >= titleAt ? <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(4,5,13,0.78), transparent 75%)'}} /> : null}
      {scene.title ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <Sfx name="impact" at={titleAt} i={index} volume={0.5} />
          <KineticText text={scene.title} size={118 * u} fitWidth={width * 0.8} delay={titleAt} weight={800} color="#ffffff" />
        </AbsoluteFill>
      ) : null}
      {scene.label ? (
        <div style={{position: 'absolute', left: width * 0.07, bottom: height * 0.09, display: 'flex', alignItems: 'baseline', gap: 12 * u, color: '#ffffff', background: 'rgba(4,5,13,0.72)', padding: `${6 * u}px ${20 * u}px`, borderRadius: 14 * u}}>
          <span style={{fontFamily: displayFamily, fontWeight: 800, fontSize: 54 * u, fontVariantNumeric: 'tabular-nums'}}>{counter.toLocaleString('en-US')}</span>
          <span style={{fontFamily: serifItalicFamily, fontSize: 40 * u, opacity: 0.85}}>{scene.label}</span>
        </div>
      ) : null}
    </Stage>
  );
};

const Gallery: React.FC<{scene: SceneOf<'space'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter, fpb, duration, index} = useScene();
  const u = useUnit();
  const {accent, accent2} = config.brand.colors;
  const images = (scene.images ?? []).slice(0, 6);
  const n = Math.max(1, images.length);
  const GAP = 1500;
  const t = Math.max(0, frame - enter * 0.3);
  // the camera rests at each card, then glides to the next
  const pos = (t / Math.max(1, duration - enter * 0.3 - fpb)) * n;
  const at = Math.min(n - 1, Math.floor(pos));
  const glide = at + smooth((pos - at - 0.55) / 0.45);
  const side = (i: number) => (i % 2 ? 1 : -1);
  const cardX = (i: number) => side(i) * 520;
  const lerp = (f: (i: number) => number) => {
    const a = Math.min(n - 1, Math.floor(glide));
    const b = Math.min(n - 1, a + 1);
    return f(a) + (f(b) - f(a)) * (glide - a);
  };
  const W = 1180;
  const H = W * 0.6;
  const items: SpaceItem[] = images.map((img, i) => ({
    key: `g${i}`,
    x: cardX(i),
    y: Math.sin(i * 1.7) * 90,
    z: 1180 + i * GAP,
    w: W,
    h: H + 110,
    ry: -side(i) * 20 + Math.sin(t / fpb / 3 + i) * 2.5,
    rx: 3,
    node: (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 22}}>
        <div style={{flex: 1, borderRadius: 26, overflow: 'hidden', background: '#0b0c16', border: `3px solid ${alpha(i % 2 ? accent : accent2, 0.8)}`, boxShadow: `0 50px 140px rgba(0,0,0,0.7), 0 0 90px ${alpha(i % 2 ? accent : accent2, 0.35)}`}}>
          <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left'}} />
        </div>
        {scene.labels?.[i] ? (
          <div style={{display: 'flex', alignItems: 'center', gap: 18, color: '#ffffff', fontFamily: displayFamily, fontWeight: 800, fontSize: 58}}>
            <span style={{fontFamily: monoFamily, fontSize: 40, color: i % 2 ? accent : accent2}}>{String(i + 1).padStart(2, '0')}</span>
            {scene.labels[i]}
          </div>
        ) : null}
      </div>
    ),
  }));
  // dust between the cards gives the camera something to move past
  for (let k = 0; k < 70; k++) {
    items.push({
      key: `d${k}`,
      x: (random(`dx${k}`) - 0.5) * 4200,
      y: (random(`dy${k}`) - 0.5) * 2200,
      z: 400 + random(`dz${k}`) * (n * GAP + 1800),
      w: 14,
      h: 14,
      opacity: 0.5,
      node: <div style={{width: '100%', height: '100%', borderRadius: '50%', background: k % 3 ? '#ffffff' : accent2}} />,
    });
  }
  const camera = {x: lerp(cardX) * 0.9, y: lerp((i) => Math.sin(i * 1.7) * 90) - 30, z: lerp((i) => i * GAP) - 60 + Math.sin(t / fpb / 2) * 20, focus: 1240, roll: -lerp((i) => side(i)) * 1.2, aperture: 22, lens: 1150};

  return (
    <Stage>
      {images.map((_, i) => (
        <Sfx key={i} name="whoosh-2" at={Math.round(enter * 0.3 + ((i + 0.55) / n) * (duration - enter * 0.3 - fpb))} i={i} volume={i < n - 1 ? 0.45 : 0} />
      ))}
      <Space items={items} camera={camera} fog={3600} />
      {scene.title ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: height * 0.07, display: 'flex', justifyContent: 'center'}}>
          <KineticText text={scene.title} size={62 * u} fitWidth={width * 0.8} delay={enter} weight={800} color="#ffffff" />
        </div>
      ) : null}
      <Sfx name="impact" at={enter} i={index} volume={0.3} />
    </Stage>
  );
};

const Vortex: React.FC<{scene: SceneOf<'space'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter, fpb, duration, index} = useScene();
  const u = useUnit();
  const {accent, accent2} = config.brand.colors;
  const ref = useRef<HTMLCanvasElement>(null);
  const t = Math.max(0, frame - enter);
  const gather = smooth(t / Math.max(1, (duration - enter) * 0.5));
  const flareAt = enter + Math.round((duration - enter) * 0.55);
  const flare = Math.max(0, 1 - Math.abs(frame - flareAt - 4) / 10);
  const settled = smooth((frame - flareAt) / (fpb * 1.5));

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const N = 3400;
    const cx = width / 2;
    const cy = height * 0.47;
    const tilt = 0.34; // the disc is seen from above at an angle
    const colors = ['#ffffff', accent, accent2, '#ffffff'];
    for (let i = 0; i < N; i++) {
      const r = 70 + Math.pow(random(`vr${i}`), 1.5) * width * 0.46;
      const a0 = random(`va${i}`) * Math.PI * 2;
      const a = a0 + (t / fpb) * (0.9 * (140 / r) + 0.08);
      // scattered start → orbit
      const sx = (random(`vx${i}`) - 0.5) * width * 1.5;
      const sy = (random(`vy${i}`) - 0.5) * height * 1.5;
      const ox = Math.cos(a) * r;
      const oy = Math.sin(a) * r * tilt;
      const g = smooth(gather * 1.4 - random(`vd${i}`) * 0.4);
      const x = cx + sx + (ox - sx) * g;
      const y = cy + sy + (oy - sy) * g;
      const near = Math.sin(a) > 0 ? 1 : 0.55; // the front of the disc is brighter
      const size = (1.4 + random(`vs${i}`) * 3.6) * u * (0.7 + 0.5 * near) * (1 + flare * 1.5);
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = Math.min(1, (0.45 + 0.55 * random(`vo${i}`)) * near * Math.min(1, t / 8));
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [frame, width, height, accent, accent2, t, fpb, gather, flare, u]);

  return (
    <Stage>
      <Sfx name="riser" at={enter} i={index} volume={0.5} />
      <Sfx name="impact" at={flareAt} i={index} volume={0.7} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse ${28 + gather * 10}% ${12 + gather * 5}% at 50% 47%, ${alpha('#ffffff', 0.5 * gather)}, ${alpha(accent2, 0.45 * gather)} 35%, ${alpha(accent, 0.18 * gather)} 65%, transparent 100%)`, mixBlendMode: 'screen'}} />
      <canvas ref={ref} width={width} height={height} style={{position: 'absolute', inset: 0, filter: `blur(${(1 - gather) * 2}px) drop-shadow(0 0 ${6 * u}px ${alpha(accent2, 0.9)})`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 46% 20% at 50% 47%, rgba(4,5,13,${0.82 * settled}), transparent 100%)`}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 * u, top: -height * 0.06}}>
        {scene.image ? (
          <Img src={staticFile(scene.image)} style={{height: 250 * u, borderRadius: 30 * u, opacity: gather, transform: `scale(${0.6 + 0.4 * gather + flare * 0.15})`, boxShadow: `0 0 ${120 * u}px ${alpha(accent2, 0.7)}`}} />
        ) : null}
        {scene.title ? <KineticText text={scene.title} size={120 * u} fitWidth={width * 0.7} delay={flareAt} weight={800} color="#ffffff" /> : null}
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 47%, rgba(255,255,255,${flare * 0.95}) 0%, ${alpha(accent2, flare * 0.6)} 22%, transparent 60%)`, mixBlendMode: 'screen'}} />
      {scene.label ? (
        <div style={{position: 'absolute', left: 0, right: 0, bottom: height * 0.12, textAlign: 'center', fontFamily: labelFamily, fontSize: 36 * u, color: alpha('#ffffff', 0.8 * settled)}}>{scene.label}</div>
      ) : null}
    </Stage>
  );
};

export const SpaceScene: React.FC<{scene: SceneOf<'space'>}> = ({scene}) => {
  switch (scene.mode) {
    case 'gallery':
      return <Gallery scene={scene} />;
    case 'vortex':
      return <Vortex scene={scene} />;
    default:
      return <Swarm scene={scene} />;
  }
};
