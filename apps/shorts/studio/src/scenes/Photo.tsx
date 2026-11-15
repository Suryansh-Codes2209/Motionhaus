import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {Tape} from '../components/fx/paper';
import {PhotoMontage} from '../components/fx/photos';
import {impactFamily, labelFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// Real-world photos (fetched with `shorts photos`, licensed CC0/CC BY). One
// image: a full-bleed documentary shot, the camera creeping toward `focus`.
// montage (mode "montage", default for 4+ images): full-bleed photos hard-cut
// on the beat with a shutter sound and flash each (components/fx/photos).
// Two or three: prints slapped onto a blurred copy of the first, one per beat,
// with tape. The caption is the claim; the credit sits small in a corner.
// Photos always get a dark scrim and white type, whatever the palette: a
// light scrim washes them out.
export const Photo: React.FC<{scene: SceneOf<'photo'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb, duration, index} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const ink = '#000000';
  const montage = scene.mode === 'montage' || (scene.mode === undefined && scene.images.length >= 4);
  const images = montage ? scene.images : scene.images.slice(0, 3);
  const f = scene.focus ?? {x: 0.5, y: 0.4};
  const single = images.length === 1 || montage;
  const push = interpolate(frame, [0, duration], [1.06, 1.24], {...clamp, easing: Easing.inOut(Easing.sin)});
  const drift = interpolate(frame, [0, duration], [index % 2 ? -1.5 : 1.5, 0]);
  const captionAt = enter + (single ? fpb * 0.5 : fpb * images.length);
  const labelAt = captionAt + fpb * 1.5;
  const label = spring({frame: frame - labelAt, fps, config: {damping: 12, stiffness: 180}});

  // Portrait keeps everything above the caption band (~72% of the height).
  const textTop = portrait ? height * 0.56 : height * 0.64;
  const printW = portrait ? width * 0.62 : width * (images.length === 2 ? 0.36 : 0.28);
  const printH = printW * (portrait ? 0.78 : 0.72);

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: ink}}>
      <Sfx name="impact" at={enter} i={index} volume={0.45} />
      {montage ? (
        <PhotoMontage images={images} every={scene.every ?? 1} />
      ) : (
      <AbsoluteFill style={{transform: `scale(${push}) rotate(${drift}deg)`, transformOrigin: `${f.x * 100}% ${f.y * 100}%`}}>
        <Img
          src={staticFile(images[0])}
          style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${f.x * 100}% ${f.y * 100}%`, filter: single ? 'saturate(1.12) contrast(1.06)' : 'blur(18px) saturate(0.9) brightness(0.55)'}}
        />
      </AbsoluteFill>
      )}
      {/* text behind the subject: the word sits on the photo, then the subject's
          cutout (same framing, same camera move) goes back on top of it */}
      {scene.behind && scene.cutout && !montage && single ? (
        <>
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div
              style={{
                fontFamily: impactFamily,
                fontSize: Math.min(height * 0.6, (width * 0.94) / Math.max(1, scene.behind.length * 0.5)),
                lineHeight: 1,
                color: '#ffffff',
                textTransform: 'uppercase',
                marginTop: height * ((scene.behindAt ?? 0.44) - 0.5) * 2,
                textShadow: `0 ${10 * u}px ${50 * u}px rgba(0,0,0,0.45)`,
                opacity: interpolate(frame, [enter, enter + 5], [0, 1], clamp),
                transform: `translateY(${interpolate(spring({frame: frame - enter, fps, config: {damping: 15, stiffness: 110}}), [0, 1], [height * 0.22, 0])}px) scale(${interpolate(frame, [0, duration], [1.0, 1.1])})`,
              }}
            >
              {scene.behind}
            </div>
          </AbsoluteFill>
          <AbsoluteFill style={{transform: `scale(${push}) rotate(${drift}deg)`, transformOrigin: `${f.x * 100}% ${f.y * 100}%`}}>
            <Img src={staticFile(scene.cutout)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${f.x * 100}% ${f.y * 100}%`, filter: 'saturate(1.12) contrast(1.06)'}} />
          </AbsoluteFill>
        </>
      ) : null}
      {/* scrim: darkest where the caption sits */}
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${alpha(ink, 0.35)} 0%, transparent 30%, ${alpha(ink, 0.6)} 62%, ${alpha(ink, 0.88)} 100%)`}} />

      {single || montage
        ? null
        : images.map((img, i) => {
            const at = enter + i * fpb;
            const s = spring({frame: frame - at, fps, config: {damping: 13, stiffness: 160, mass: 0.9}});
            const n = images.length;
            const cx = portrait ? width / 2 + (i - (n - 1) / 2) * width * 0.12 : width / 2 + (i - (n - 1) / 2) * printW * 1.05;
            const cy = portrait ? height * (0.16 + i * 0.13) + printH / 2 : height * 0.36;
            const rot = [-5, 4, -2][i] * (index % 2 ? -1 : 1);
            return (
              <div
                key={img}
                style={{
                  position: 'absolute',
                  left: cx - printW / 2,
                  top: cy - printH / 2,
                  width: printW,
                  height: printH,
                  padding: 14 * u,
                  background: '#fbfaf6',
                  boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.45)`,
                  opacity: Math.min(1, s * 3),
                  transform: `translateY(${(1 - s) * height * 0.5}px) rotate(${interpolate(s, [0, 1], [rot * 3, rot])}deg) scale(${1.15 - 0.15 * s})`,
                }}
              >
                <Sfx name="pop" at={at} i={i} volume={0.4} />
                <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                <Tape x={printW * 0.5} y={0} w={150 * u} h={40 * u} angle={rot * 2} />
              </div>
            );
          })}

      {scene.caption ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: textTop, display: 'flex', justifyContent: 'center'}}>
          <KineticText text={scene.caption} size={(portrait ? 96 : 104) * u} fitWidth={width * 0.86} delay={captionAt} weight={800} color="#ffffff" />
        </div>
      ) : null}
      {scene.label ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: textTop + (portrait ? 150 : 150) * u,
            display: 'flex',
            justifyContent: 'center',
            opacity: frame >= labelAt ? 1 : 0,
          }}
        >
          <span
            style={{
              fontFamily: labelFamily,
              fontWeight: 700,
              fontSize: 40 * u,
              letterSpacing: 1,
              color: '#ffffff',
              background: colors.accent,
              padding: `${8 * u}px ${22 * u}px`,
              borderRadius: 8 * u,
              transform: `scale(${label}) rotate(-2deg)`,
            }}
          >
            {scene.label}
          </span>
        </div>
      ) : null}
      {scene.credit ? (
        // inset from the edges: the long-form camera push crops the outer ~6%
        <div style={{position: 'absolute', left: width * 0.08, bottom: height * (portrait ? 0.03 : 0.07), maxWidth: width * 0.6, fontFamily: labelFamily, fontSize: 20 * u, color: alpha('#ffffff', 0.85), background: alpha(ink, 0.45), padding: `${3 * u}px ${10 * u}px`, borderRadius: 4 * u}}>
          {scene.credit}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
