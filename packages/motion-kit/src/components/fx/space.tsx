import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

// A small 3D stage with a real camera and depth of field. Each item is a flat
// plane somewhere in space; the stage projects it onto the frame (size and
// position from its distance), tilts it in its own 3D, and throws it out of
// focus by how far it sits from the focal plane. Items are grouped into depth
// bands so one blur filter covers a whole band, which keeps hundreds of planes
// cheap to draw. Everything is a pure function of the props.

export type SpaceItem = {
  key: string;
  x: number;
  y: number;
  z: number; // distance into the scene, in px at the focal plane's scale
  w: number;
  h: number;
  rx?: number; // degrees
  ry?: number;
  rz?: number;
  opacity?: number;
  scale?: number;
  node: React.ReactNode;
};

export type SpaceCamera = {
  x: number;
  y: number;
  z: number; // items with z > camera.z are in front of it
  focus: number; // distance from the camera that is sharp
  lens?: number; // focal length in px (default 1100): smaller = wider
  roll?: number; // degrees
  aperture?: number; // blur strength (default 16)
};

const BLURS = [0, 1.5, 3.5, 7, 12, 20];

export const Space: React.FC<{items: SpaceItem[]; camera: SpaceCamera; fog?: number}> = ({items, camera, fog = 5200}) => {
  const {width, height} = useVideoConfig();
  const lens = camera.lens ?? 1100;
  const aperture = camera.aperture ?? 16;

  // 11 bands: far-blurred … sharp … near-blurred, drawn back to front.
  const bands: {d: number; el: React.ReactNode}[][] = Array.from({length: BLURS.length * 2 - 1}, () => []);
  for (const it of items) {
    const d = it.z - camera.z;
    if (d < 60) continue;
    const s = (lens / d) * (it.scale ?? 1);
    const sx = width / 2 + (it.x - camera.x) * (lens / d);
    const sy = height / 2 + (it.y - camera.y) * (lens / d);
    const half = Math.max(it.w, it.h) * s * 0.75;
    if (sx < -half || sx > width + half || sy < -half || sy > height + half) continue;
    const off = (d - camera.focus) / camera.focus; // <0 nearer than focus, >0 farther
    const blur = Math.min(BLURS[BLURS.length - 1], Math.abs(off) * aperture * (off < 0 ? 1.6 : 1));
    let level = 0;
    for (let i = 0; i < BLURS.length; i++) if (Math.abs(BLURS[i] - blur) < Math.abs(BLURS[level] - blur)) level = i;
    const band = off >= 0 ? BLURS.length - 1 - level : BLURS.length - 1 + level;
    const haze = Math.max(0, 1 - Math.max(0, d - camera.focus) / fog);
    const tooClose = Math.min(1, Math.max(0, (d - 60) / (camera.focus * 0.18)));
    const opacity = (it.opacity ?? 1) * (0.25 + 0.75 * haze) * tooClose;
    if (opacity <= 0.01) continue;
    bands[band].push({
      d,
      el: (
        <div
          key={it.key}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: it.w,
            height: it.h,
            opacity,
            transformOrigin: 'center',
            transform: `translate(${sx - it.w / 2}px, ${sy - it.h / 2}px) scale(${s}) perspective(1400px) rotateX(${it.rx ?? 0}deg) rotateY(${it.ry ?? 0}deg) rotateZ(${it.rz ?? 0}deg)`,
            willChange: 'transform',
          }}
        >
          {it.node}
        </div>
      ),
    });
  }

  return (
    <AbsoluteFill style={{overflow: 'hidden', transform: camera.roll ? `rotate(${camera.roll}deg) scale(1.06)` : undefined}}>
      {bands.map((band, i) => {
        if (!band.length) return null;
        const level = Math.abs(i - (BLURS.length - 1));
        band.sort((a, b) => b.d - a.d);
        return (
          <AbsoluteFill key={i} style={{filter: BLURS[level] ? `blur(${BLURS[level]}px)` : undefined}}>
            {band.map((b) => b.el)}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
