import React from 'react';
import {AbsoluteFill, Img, interpolate, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {StyleBackground} from '../components/StyleLayers';
import {alpha, clamp, isDark} from '../lib/util';
import type {Timeline} from '../timeline';
import {config, episode} from '../video.config';
import {Floaters3D} from './Floaters3D';
import {chapterStarts} from './timing';

// Long-form backgrounds change with the chapters, so two minutes never sit on
// one backdrop. Every set keeps the palette's background tone (scene text is
// drawn for it) and adds its own depth: the style's canvas, drifting light,
// a 3D floor, floating 3D shapes, slow rings. Each chapter's set fades in
// over the last one. A chapter can pick its set with `backdrop`.

export const SETS = ['canvas', 'shapes3d', 'aurora', 'floor', 'rings', 'plate'] as const;
export type SetName = (typeof SETS)[number];
// Default order by chapter: the style's own look first, then alternate.
const ORDER: SetName[] = ['canvas', 'shapes3d', 'aurora', 'floor', 'shapes3d', 'rings'];

const FADE_SEC = 0.8;

const Aurora: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {bg, accent, accent2} = config.brand.colors;
  const t = frame / fps;
  const blob = (k: number, color: string, a: number) => {
    const x = 0.5 + Math.sin(t * 0.13 + k * 2.1) * 0.36;
    const y = 0.5 + Math.cos(t * 0.11 + k * 1.7) * 0.3;
    return `radial-gradient(ellipse ${width * 0.42}px ${height * 0.5}px at ${x * 100}% ${y * 100}%, ${alpha(color, a)}, transparent 70%)`;
  };
  return <AbsoluteFill style={{backgroundColor: bg, backgroundImage: [blob(0, accent, 0.22), blob(1, accent2, 0.2), blob(2, accent, 0.12)].join(', ')}} />;
};

// A perspective grid floor streaming toward the camera, with a horizon glow.
const Floor: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {bg, fg, accent} = config.brand.colors;
  const cell = 120;
  const shift = ((frame / fps) * 60) % cell;
  return (
    <AbsoluteFill style={{backgroundColor: bg, perspective: 900, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 30% at 50% 58%, ${alpha(accent, 0.25)}, transparent 70%)`}} />
      <div
        style={{
          position: 'absolute',
          left: '-50%',
          width: '200%',
          top: '58%',
          height: '120%',
          transformOrigin: '50% 0%',
          transform: 'rotateX(72deg)',
          backgroundImage: `linear-gradient(${alpha(fg, 0.14)} 2px, transparent 2px), linear-gradient(90deg, ${alpha(fg, 0.14)} 2px, transparent 2px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `0 ${shift}px`,
          maskImage: 'linear-gradient(to bottom, transparent, black 30%)',
        }}
      />
    </AbsoluteFill>
  );
};

const Rings: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {bg, accent, accent2} = config.brand.colors;
  const t = frame / fps;
  return (
    <AbsoluteFill style={{backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const r = 380 + i * 230 + Math.sin(t * 0.6 + i) * 14;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: r,
              height: r,
              borderRadius: '50%',
              border: `${i % 2 ? 2 : 3}px ${i % 3 === 2 ? 'dashed' : 'solid'} ${alpha(i % 2 ? accent2 : accent, 0.16)}`,
              transform: `rotate(${t * (i % 2 ? -6 : 8) + i * 20}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// plate: the episode's own photo or footage as the set, so no two videos share
// a background. It is thrown out of focus, graded into the palette's
// background tone (scene text is drawn for that tone) and kept slowly moving.
const Plate: React.FC<{src?: string; seed: number; length: number}> = ({src, seed, length}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {bg, accent} = config.brand.colors;
  if (!src) return <StyleBackground />;
  const dark = isDark(bg);
  const t = frame / fps;
  const dir = seed % 2 ? 1 : -1;
  const fill: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};
  const video = /\.(mp4|webm|mov)$/i.test(src);
  return (
    <AbsoluteFill style={{backgroundColor: bg, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${1.16 + t * 0.004}) translate(${dir * (t * 0.25 - 2)}%, ${Math.sin(t * 0.2 + seed) * 0.8}%)`, filter: `blur(${video ? 10 : 7}px) saturate(${dark ? 1.25 : 0.8}) brightness(${dark ? 0.8 : 1.1})`}}>
        {video ? (
          <Loop durationInFrames={Math.max(30, length)}>
            <OffthreadVideo src={staticFile(src)} muted style={fill} />
          </Loop>
        ) : (
          <Img src={staticFile(src)} style={fill} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${alpha(bg, dark ? 0.62 : 0.8)}, ${alpha(bg, dark ? 0.8 : 0.9)})`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 60% at ${50 + dir * 22}% 40%, ${alpha(accent, 0.16)}, transparent 70%)`}} />
    </AbsoluteFill>
  );
};

const SetView: React.FC<{name: SetName; seed: number; plate?: string; length: number}> = ({name, seed, plate, length}) => {
  switch (name) {
    case 'plate':
      return <Plate src={plate} seed={seed} length={length} />;
    case 'shapes3d':
      return <Floaters3D colors={config.brand.colors} seed={seed} />;
    case 'aurora':
      return <Aurora />;
    case 'floor':
      return <Floor />;
    case 'rings':
      return <Rings />;
    default:
      return <StyleBackground />;
  }
};

const Fading: React.FC<{fadeIn: boolean; children: React.ReactNode}> = ({fadeIn, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o = fadeIn ? interpolate(frame, [0, FADE_SEC * fps], [0, 1], clamp) : 1;
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

/** Which set each chapter uses (by chapter order, unless the chapter names one). */
export const chapterSets = (chapters: {backdrop?: string; plate?: string}[]) =>
  chapters.map((c, i) => (c.plate && !c.backdrop ? 'plate' : (SETS as readonly string[]).includes(c.backdrop ?? '') ? (c.backdrop as SetName) : ORDER[i % ORDER.length]));

export const Backdrop: React.FC<{tl: Timeline; total: number}> = ({tl, total}) => {
  const {fps} = useVideoConfig();
  const chapters = episode.chapters?.length ? episode.chapters : [{title: '', scene: 0}];
  const starts = chapterStarts(tl, chapters);
  const own = starts.map((s) => chapters.find((c) => c.scene === s.scene) ?? {}) as {backdrop?: string; plate?: string}[];
  const sets = chapterSets(own);
  const fade = Math.round(FADE_SEC * fps);
  return (
    <>
      {starts.map((c, i) => {
        const end = i < starts.length - 1 ? starts[i + 1].from + fade : total;
        return (
          <Sequence key={c.scene} from={c.from} durationInFrames={Math.max(1, end - c.from)}>
            <Fading fadeIn={i > 0}>
              <SetView name={sets[i]} seed={i + 1} plate={own[i].plate} length={Math.max(1, end - c.from)} />
            </Fading>
          </Sequence>
        );
      })}
    </>
  );
};
