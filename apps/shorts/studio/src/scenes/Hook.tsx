import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {EASE, keywordOf, MotionText, moveStyle} from '../components/fx/moves';
import {KineticText} from '../components/KineticText';
import {IMPACT_WIDTH, impactFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import {accentFill, onAccent} from '../styles';
import type {SceneOf} from '../types';
import {config} from '../video.config';

type HookScene = SceneOf<'hook'>;

// A camera op's snap: past the target, then settles. 0 before `at`.
const snap = (frame: number, at: number, amount: number, frames = 8) => {
  const t = (frame - at) / frames;
  return t <= 0 ? 0 : t >= 1 ? amount : amount * (1 - Math.exp(-6 * t) * Math.cos(t * Math.PI * 1.5));
};

// The product shot or clip behind the lines. Frame 0 is the Shorts list and
// search thumbnail, so the shot stays bright: a light scrim, darkest only
// behind the lines (2026-11-08 review: near-black first frames).
const Footage: React.FC<{scene: HookScene; scale: number; dim?: number; blur?: number}> = ({scene, scale, dim = 0, blur = 0}) => {
  const {bg} = config.brand.colors;
  if (!scene.video && !scene.image) return null;
  const media: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%'};
  return (
    <AbsoluteFill style={{transform: `scale(${scale * 1.04})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined}}>
      {scene.video ? <OffthreadVideo src={staticFile(scene.video)} muted style={media} /> : <Img src={staticFile(scene.image as string)} style={media} />}
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${bg}1f 0%, ${bg}80 38%, ${bg}80 64%, ${bg}1f 100%)`}} />
      {dim > 0 ? <AbsoluteFill style={{background: alpha(bg, dim)}} /> : null}
    </AbsoluteFill>
  );
};

// The twist, one line per beat. Line 1 is already landing on frame 0.
const Lines: React.FC<{scene: HookScene; size?: number; build?: boolean}> = ({scene, size, build}) => {
  const {width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const onShot = Boolean(scene.video || scene.image);
  const px = (size ?? (portrait ? 118 : 138)) * u;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 18 * u, filter: onShot ? `drop-shadow(0 ${6 * u}px ${18 * u}px rgba(0,0,0,0.75))` : undefined}}>
      {scene.lines.map((line, i) => {
        const at = i === 0 ? -6 : enter + i * fpb;
        return (
          <React.Fragment key={i}>
            {build ? (
              // words land on shrinking gaps and each one is bigger than the last
              <MotionText text={line} size={px * 0.82} move="pop" at={i === 0 ? -8 : at} gaps={[6, 5, 4, 3]} grow={1.1} dur={7} fitWidth={width * (portrait ? 1.25 : 0.7)} />
            ) : (
              // Portrait lines may wrap to two rows, so allow ~2 widths.
              <KineticText text={line} size={px} fitWidth={width * (portrait ? 1.6 : 0.82)} delay={at} weight={800} />
            )}
            <Sfx name="tick" at={Math.max(0, at)} i={i} volume={0.5} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

// One keyword in the condensed poster face, sized to a share of the width.
const useKeyword = (scene: HookScene, share: number, maxH: number) => {
  const {width, height} = useVideoConfig();
  const word = (scene.keyword ?? keywordOf(scene.lines.join(' '))).toUpperCase();
  const size = Math.min(height * maxH, (width * share) / Math.max(1, word.length * 0.55 * IMPACT_WIDTH));
  return {word, size};
};

// band: a flat colour band sweeps in across the top, the shot drops under
// it, and the keyword lands in the band one letter at a time.
const Band: React.FC<{scene: HookScene; zoom: number}> = ({scene, zoom}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const u = useUnit();
  const {word, size} = useKeyword(scene, 0.86, 0.13);
  const sweep = EASE.snap(Math.min(1, Math.max(0, (frame + 6) / 9)));
  const bandH = height * 0.2;
  const landed = -3 + word.length * 2 + 6;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{top: bandH * sweep * 0.82, overflow: 'hidden'}}>
        <Footage scene={scene} scale={zoom} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 90 * u, paddingBottom: 90 * u + bandH}}>
          <Lines scene={scene} size={104} />
        </AbsoluteFill>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bandH, background: accentFill(100), transform: `translateX(${(sweep - 1) * 100}%)`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: bandH * 0.08, boxShadow: `0 ${10 * u}px ${40 * u}px rgba(0,0,0,0.35)`}}>
        <MotionText text={word} size={size} move="drop" split="chars" at={-3} stagger={2} dur={6} family={impactFamily} weight={400} color={onAccent()} letterSpacing="0.01em" lineHeight={1} />
      </div>
      <Sfx name="whoosh-1" at={0} volume={0.45} />
      <Sfx name="impact" at={landed} volume={0.5} />
    </AbsoluteFill>
  );
};

// echo: the shot dims while the keyword repeats down the frame as outlines
// that rise in and settle on one solid copy.
const Echo: React.FC<{scene: HookScene; zoom: number}> = ({scene, zoom}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const u = useUnit();
  const {accent} = config.brand.colors;
  const {word, size} = useKeyword(scene, 0.9, 0.078);
  const rows = 6;
  const dim = interpolate(frame, [4, 30], [0, 0.55], clamp);
  return (
    <AbsoluteFill>
      <Footage scene={scene} scale={zoom} dim={dim} />
      <div style={{position: 'absolute', left: 0, right: 0, top: height * 0.07, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {Array.from({length: rows}, (_, r) => {
          const solid = r === rows - 1;
          const at = -4 + r * 2;
          const css = moveStyle('rise', (frame - at) / 8, 'expo');
          return (
            <div key={r} style={{fontFamily: impactFamily, fontSize: size, lineHeight: 0.98, letterSpacing: '0.01em', ...(solid ? {color: accent, textShadow: `0 0 ${40 * u}px ${alpha(accent, 0.6)}`} : {color: 'transparent', WebkitTextStroke: `${2.5 * u}px ${alpha(accent, 0.3 + 0.1 * r)}`}), ...css}}>
              {word}
              <Sfx name="tick" at={Math.max(0, at)} i={r} volume={0.3} />
            </div>
          );
        })}
      </div>
      <Sfx name="impact" at={-4 + rows * 2 + 4} volume={0.5} />
      <div style={{position: 'absolute', left: 0, right: 0, top: height * 0.07 + size * 0.98 * rows + 30 * u, display: 'flex', justifyContent: 'center', padding: `0 ${70 * u}px`}}>
        <Lines scene={scene} size={96} />
      </div>
    </AbsoluteFill>
  );
};

// card: the full-bleed shot punches in, then shrinks into a rounded card on
// the style's backdrop with the giant keyword slamming in above it.
const Card: React.FC<{scene: HookScene; zoom: number}> = ({scene, zoom}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const {fg, bg} = config.brand.colors;
  const {word, size} = useKeyword(scene, 0.88, 0.15);
  const k = EASE.inOut(Math.min(1, Math.max(0, (frame - 9) / 10)));
  const top = height * 0.27 * k;
  const side = width * 0.07 * k;
  const bottom = height * 0.29 * k;
  return (
    <AbsoluteFill>
      {k > 0 ? <AbsoluteFill style={{background: alpha(bg, 0.86 * k)}} /> : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: height * 0.075, display: 'flex', justifyContent: 'center'}}>
        <MotionText text={word} size={size} move="slam" split="line" at={13} dur={7} family={impactFamily} weight={400} color={fg} letterSpacing="0.01em" lineHeight={1} />
      </div>
      <div style={{position: 'absolute', left: side, right: side, top, bottom, borderRadius: 44 * u * k, overflow: 'hidden', boxShadow: k > 0 ? `0 ${30 * u}px ${90 * u}px rgba(0,0,0,${0.45 * k})` : undefined}}>
        <Footage scene={scene} scale={zoom} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70 * u}}>
          <Lines scene={scene} size={118 - 22 * k} />
        </AbsoluteFill>
      </div>
      <Sfx name="whoosh-2" at={9} volume={0.4} />
      <Sfx name="impact" at={15} volume={0.55} />
    </AbsoluteFill>
  );
};

// ghost: a blur pop on the shot drops a giant outlined keyword across the
// top, cropped by the frame and drifting.
const Ghost: React.FC<{scene: HookScene; zoom: number}> = ({scene, zoom}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const {fg, accent} = config.brand.colors;
  const {word} = useKeyword(scene, 1, 1);
  const size = Math.min(height * 0.22, (width * 1.5) / Math.max(1, word.length * 0.55 * IMPACT_WIDTH));
  const pop = interpolate(frame, [5, 8, 15], [0, 16, 0], clamp);
  const css = moveStyle('blur', (frame - 6) / 9, 'out');
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Footage scene={scene} scale={zoom + pop * 0.004} blur={pop} />
      <div style={{position: 'absolute', top: height * 0.06, left: '50%', whiteSpace: 'nowrap', fontFamily: impactFamily, fontSize: size, lineHeight: 1, color: 'transparent', WebkitTextStroke: `${5 * u}px ${alpha(fg, 0.9)}`, ...css, transform: `translateX(calc(-50% - ${frame * 1.6 * u}px))`}}>{word}</div>
      <div style={{position: 'absolute', top: height * 0.06 + size * 0.86, left: 70 * u, fontFamily: impactFamily, fontSize: 64 * u, lineHeight: 1, padding: `${10 * u}px ${22 * u}px`, background: accent, color: onAccent(), ...moveStyle('pop', (frame - 10) / 7)}}>{word}</div>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 90 * u, paddingTop: height * 0.2}}>
        <Lines scene={scene} />
      </AbsoluteFill>
      <Sfx name="whoosh-3" at={5} volume={0.4} />
      <Sfx name="pop" at={10} volume={0.5} />
    </AbsoluteFill>
  );
};

// tag: a torn paper tag with the keyword slams in at the top while the whole
// frame takes the knock (a skew that decays).
const Tag: React.FC<{scene: HookScene; zoom: number}> = ({scene, zoom}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const u = useUnit();
  const {word, size} = useKeyword(scene, 0.62, 0.1);
  const knock = Math.exp(-Math.max(0, frame) / 5) * Math.cos(frame * 0.9);
  const css = moveStyle('slam', (frame + 3) / 7);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `skewX(${knock * 2.2}deg) scale(1.03)`}}>
        <Footage scene={scene} scale={zoom} />
      </AbsoluteFill>
      <div style={{position: 'absolute', top: height * 0.1, left: 50 * u, transform: 'rotate(-5deg)', transformOrigin: 'left center'}}>
        <div style={{fontFamily: impactFamily, fontSize: size, lineHeight: 1, padding: `${16 * u}px ${54 * u}px ${12 * u}px ${30 * u}px`, background: accentFill(100), color: onAccent(), clipPath: 'polygon(0 0, 97% 0, 100% 14%, 96% 30%, 100% 47%, 95% 63%, 99% 80%, 96% 100%, 0 100%)', filter: `drop-shadow(${8 * u}px ${10 * u}px 0 rgba(0,0,0,0.35))`, ...css}}>{word}</div>
      </div>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 90 * u, paddingTop: height * 0.12}}>
        <Lines scene={scene} />
      </AbsoluteFill>
      <Sfx name="stamp" at={1} volume={0.6} />
    </AbsoluteFill>
  );
};

// The twist over the product shot (image) or the product running (video).
// `variant` picks how the first two seconds are staged; every variant keeps
// the shot bright and line 1 on screen at frame 0.
export const Hook: React.FC<{scene: HookScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {duration} = useScene();
  const u = useUnit();
  const variant = scene.variant ?? 'rise';
  const drift = interpolate(frame, [0, duration], [1, 1.08]);
  // every variant but the original opens with a snap zoom at ~0.1 s
  const zoom = drift + (variant === 'rise' ? 0 : snap(frame, 3, 0.1));

  switch (variant) {
    case 'band':
      return <Band scene={scene} zoom={zoom} />;
    case 'echo':
      return <Echo scene={scene} zoom={zoom} />;
    case 'card':
      return <Card scene={scene} zoom={zoom} />;
    case 'ghost':
      return <Ghost scene={scene} zoom={zoom} />;
    case 'tag':
      return <Tag scene={scene} zoom={zoom} />;
    default:
      return (
        <AbsoluteFill>
          <Footage scene={scene} scale={zoom} />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 90 * u, transform: `scale(${drift})`}}>
            <Lines scene={scene} build={variant === 'build'} />
          </AbsoluteFill>
        </AbsoluteFill>
      );
  }
};
