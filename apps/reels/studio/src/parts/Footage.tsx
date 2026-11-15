import React from 'react';
import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {edgeGain, zoomAt} from '../timing';
import type {Segment, Zoom} from '../types';

const GRADE = 'contrast(1.07) saturate(1.12) brightness(1.02)';

// The talking head: kept segments back to back (jump cuts), punch-in zooms on
// the speaker's face, a slow push inside each segment so no shot sits dead
// still, a short shake on hits (children ride the same move), and a blurred freeze of the last frame under
// the outro.
export const Footage: React.FC<{segments: Segment[]; video: string; zooms: Zoom[]; focus: {x: number; y: number}; hits: number[]; kicks?: number[]; bodyEnd: number; children?: React.ReactNode}> = ({
  segments,
  video,
  zooms,
  focus,
  hits,
  kicks = [],
  bodyEnd,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seg = segments.find((s) => frame >= s.from && frame < s.from + s.dur) ?? segments[segments.length - 1];
  const push = seg ? 1 + 0.035 * Math.min(1, (frame - seg.from) / Math.max(1, seg.dur)) : 1;
  const scale = zoomAt(frame, zooms) * push;

  const sinceHit = Math.min(...hits.map((h) => (frame >= h ? frame - h : Infinity)));
  const amp = sinceHit < 10 ? 18 * (1 - sinceHit / 10) : 0;
  const sx = amp * (random(`sx${frame}`) * 2 - 1);
  const sy = amp * (random(`sy${frame}`) * 2 - 1);
  // flash transitions: a quick zoom punch with motion blur that settles
  const sinceKick = Math.min(...kicks.map((k) => (frame >= k ? frame - k : Infinity)));
  const kick = sinceKick < 9 ? 1 - sinceKick / 9 : 0;

  const last = segments[segments.length - 1];
  const outro = frame >= bodyEnd;
  const blur = outro ? interpolate(frame - bodyEnd, [0, 10], [0, 22], {extrapolateRight: 'clamp'}) : 0;
  const dim = outro ? interpolate(frame - bodyEnd, [0, 10], [1, 0.45], {extrapolateRight: 'clamp'}) : 1;

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `translate(${sx}px, ${sy}px) scale(${scale * (1 + 0.12 * kick)})`,
          transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
          filter: `${GRADE} blur(${blur + 9 * kick}px) brightness(${dim})`,
        }}
      >
        {segments.map((s, i) => (
          <Sequence key={i} from={s.from} durationInFrames={s.dur}>
            <Clip video={video} startFrom={Math.round(s.srcStart * fps)} dur={s.dur} />
          </Sequence>
        ))}
        {last ? (
          <Sequence from={bodyEnd}>
            <Freeze frame={last.dur - 1}>
              <OffthreadVideo src={staticFile(video)} startFrom={Math.round(last.srcStart * fps)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </Freeze>
          </Sequence>
        ) : null}
        {/* layers that ride the camera: text behind the speaker, the cutout */}
        {children}
      </AbsoluteFill>
      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(0,0,0,0.38) 100%)'}} />
    </AbsoluteFill>
  );
};

const Clip: React.FC<{video: string; startFrom: number; dur: number}> = ({video, startFrom, dur}) => (
  <OffthreadVideo
    src={staticFile(video)}
    startFrom={startFrom}
    volume={(f) => edgeGain(f, dur)}
    style={{width: '100%', height: '100%', objectFit: 'cover'}}
  />
);
