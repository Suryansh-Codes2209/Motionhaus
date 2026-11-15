import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

const fmt = (v: number, prefix = '', suffix = '') =>
  `${prefix}${v.toLocaleString('en-US', {maximumFractionDigits: v < 10 ? 1 : 0})}${suffix}`;

// Growth chart: bars spring up on a stagger (or a line draws itself with a
// glowing head), the final point gets the accent and a counting label.
export const Chart: React.FC<{scene: SceneOf<'chart'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const data = scene.data.slice(0, 8);
  const n = data.length;
  const max = Math.max(...data.map((d) => d.value), 1);
  const cw = portrait ? width * 0.86 : Math.min(width * 0.7, 1400 * u);
  // Vertical: shorter, and lifted (paddingBottom below) so axis labels clear
  // burned-in captions and the Shorts/Reels bottom overlay.
  const ch = portrait ? height * 0.3 : height * (scene.title ? 0.46 : 0.56);
  const start = enter + (scene.title ? fpb : fpb * 0.4);
  const labelSize = Math.min(28 * u, (cw / n) * 0.22);

  const grid = (
    <>
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <div
          key={g}
          style={{position: 'absolute', left: 0, right: 0, bottom: g * ch * 0.88, height: 1.5 * u, background: alpha(colors.fg, 0.07)}}
        />
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 * u, background: alpha(colors.fg, 0.2)}} />
    </>
  );

  const labels = (
    <div style={{display: 'flex', width: cw, marginTop: 18 * u}}>
      {data.map((d, i) => (
        <div
          key={i}
          style={{flex: 1, textAlign: 'center', fontFamily: bodyFamily, fontSize: labelSize, color: i === n - 1 ? colors.fg : colors.muted}}
        >
          {d.label}
        </div>
      ))}
    </div>
  );

  let body: React.ReactNode;
  if ((scene.kind ?? 'bar') === 'bar') {
    const slot = cw / n;
    body = (
      <div style={{position: 'relative', width: cw, height: ch}}>
        {grid}
        {data.map((d, i) => {
          const at = start + i * fpb * 0.35;
          const s = spring({frame: frame - at, fps, config: {damping: 15, stiffness: 120}});
          const h = (d.value / max) * ch * 0.88 * s;
          const last = i === n - 1;
          return (
            <React.Fragment key={i}>
              <Sfx name={last ? 'pop' : 'tick'} at={at} i={i} volume={last ? 0.6 : 0.3} />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: i * slot + slot * 0.18,
                  width: slot * 0.64,
                  height: h,
                  borderRadius: `${14 * u}px ${14 * u}px ${4 * u}px ${4 * u}px`,
                  background: last ? `linear-gradient(180deg, ${colors.accent2}, ${colors.accent})` : alpha(colors.fg, 0.16),
                  boxShadow: last ? `0 0 ${60 * u}px ${alpha(colors.accent, 0.6)}` : undefined,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: h + 12 * u,
                  left: i * slot,
                  width: slot,
                  textAlign: 'center',
                  fontFamily: displayFamily,
                  fontWeight: Math.min(700, displayMaxWeight),
                  fontSize: (last ? 1.5 : 1) * labelSize * 1.1,
                  color: last ? colors.fg : colors.muted,
                  opacity: s,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmt(d.value * Math.min(1, s), scene.prefix, scene.suffix)}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  } else {
    const pts = data.map((d, i) => [((i + 0.5) / n) * cw, ch - (d.value / max) * ch * 0.88] as const);
    const segLen = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const L = segLen.reduce((a, b) => a + b, 0);
    const p = interpolate(frame, [start, start + fpb * 2.5], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
    // Walk the polyline to find the head position at p·L.
    let rem = p * L;
    let head: readonly [number, number] = pts[0];
    for (let i = 0; i < segLen.length; i++) {
      if (rem <= segLen[i] || i === segLen.length - 1) {
        const t = segLen[i] ? Math.min(1, rem / segLen[i]) : 1;
        head = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
        break;
      }
      rem -= segLen[i];
    }
    const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]},${q[1]}`).join(' ');
    const area = `${d} L${pts[n - 1][0]},${ch} L${pts[0][0]},${ch} Z`;
    const lastV = data[n - 1].value;
    body = (
      <div style={{position: 'relative', width: cw, height: ch}}>
        {grid}
        <Sfx name="pop" at={start + fpb * 2.5} volume={0.6} />
        <svg width={cw} height={ch} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <linearGradient id="lr-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.45} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lr-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.accent} />
              <stop offset="100%" stopColor={colors.accent2} />
            </linearGradient>
            <clipPath id="lr-reveal">
              <rect x={0} y={-50} width={head[0]} height={ch + 100} />
            </clipPath>
          </defs>
          <path d={area} fill="url(#lr-area)" clipPath="url(#lr-reveal)" />
          <path
            d={d}
            fill="none"
            stroke="url(#lr-line)"
            strokeWidth={7 * u}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={L}
            strokeDashoffset={L * (1 - p)}
            style={{filter: `drop-shadow(0 0 ${14 * u}px ${colors.accent})`}}
          />
          {p > 0 ? <circle cx={head[0]} cy={head[1]} r={13 * u} fill={colors.fg} stroke={colors.accent2} strokeWidth={6 * u} /> : null}
        </svg>
        <div
          style={{
            position: 'absolute',
            left: head[0],
            top: head[1] - 90 * u,
            transform: 'translateX(-50%)',
            fontFamily: displayFamily,
            fontWeight: Math.min(800, displayMaxWeight),
            fontSize: 58 * u,
            color: colors.fg,
            whiteSpace: 'nowrap',
            opacity: Math.min(1, p * 3),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmt(data[0].value + (lastV - data[0].value) * p, scene.prefix, scene.suffix)}
        </div>
      </div>
    );
  }

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 70 * u, paddingBottom: portrait ? height * 0.14 : 0}}>
      {scene.title ? <KineticText text={scene.title} size={80 * u} fitWidth={width * 0.86} delay={enter} /> : null}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {body}
        {labels}
      </div>
    </AbsoluteFill>
  );
};
