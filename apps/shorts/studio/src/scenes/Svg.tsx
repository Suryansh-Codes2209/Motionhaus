import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, monoFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// A custom motion graphic drawn for this episode: a plain .svg file inside
// public/ whose elements say how they move with data attributes. Times are in
// beats from the scene's start, so the drawing lands on the music.
//
//   data-in="draw|fade|pop|rise|drop|left|right|wipe"  data-at="2" data-dur="1"
//   data-out="6"                       fades away at beat 6
//   data-loop="pulse|spin|float|blink|dash|travel"  data-speed="1"
//   data-loop="travel" data-path="#lane" data-period="2" [data-once]
//                                      rides along a path (draw the rider around 0,0)
//   data-count="196" [data-suffix="%"] a <text> that counts up while it comes in
//
// Colours follow the episode: use var(--accent), var(--accent2), var(--fg),
// var(--bg), var(--muted); fonts: var(--display), var(--body), var(--mono).
// An animated element must not carry its own transform attribute (wrap it in
// a positioned <g> instead): its transform is driven from here.

const GEOMETRY = 'path,line,polyline,polygon,circle,rect,ellipse';
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const num = (el: Element, name: string, fallback: number) => {
  const v = el.getAttribute(name);
  return v == null || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v);
};

/** Poses every animated element for local time `t` (frames since the scene's content started). */
export const poseSvg = (root: Element, t: number, fpb: number) => {
  root.querySelectorAll<SVGElement>('[data-in],[data-loop],[data-out],[data-count]').forEach((el) => {
    const at = num(el, 'data-at', 0) * fpb;
    const dur = Math.max(1, num(el, 'data-dur', 1) * fpb);
    const kind = el.getAttribute('data-in');
    const p = kind || el.hasAttribute('data-count') ? clamp01((t - at) / dur) : 1;
    const e = easeOut(p);
    let opacity = 1;
    const tf: string[] = [];
    let clip = '';

    if (kind === 'draw') {
      const shapes = el.matches(GEOMETRY) ? [el] : Array.from(el.querySelectorAll<SVGElement>(GEOMETRY));
      for (const s of shapes) {
        s.setAttribute('pathLength', '1');
        s.style.strokeDasharray = '1';
        s.style.strokeDashoffset = String(1 - e);
      }
      opacity = p > 0 ? 1 : 0;
    } else if (kind === 'fade') opacity = e;
    else if (kind === 'pop') {
      opacity = clamp01(p * 3);
      tf.push(`scale(${e + Math.sin(p * Math.PI) * 0.14})`);
    } else if (kind === 'rise' || kind === 'drop') {
      opacity = clamp01(p * 2.5);
      tf.push(`translateY(${(kind === 'rise' ? 1 : -1) * (1 - e) * 46}px)`);
    } else if (kind === 'left' || kind === 'right') {
      opacity = clamp01(p * 2.5);
      tf.push(`translateX(${(kind === 'left' ? -1 : 1) * (1 - e) * 70}px)`);
    } else if (kind === 'wipe') {
      clip = `inset(-5% ${(1 - e) * 105}% -5% -5%)`;
      opacity = p > 0 ? 1 : 0;
    }

    if (el.hasAttribute('data-count')) {
      const to = num(el, 'data-count', 0);
      const decimals = (el.getAttribute('data-count') ?? '').split('.')[1]?.length ?? 0;
      el.textContent = (to * e).toFixed(decimals) + (el.getAttribute('data-suffix') ?? '');
    }

    if (el.hasAttribute('data-out')) opacity *= 1 - clamp01((t - num(el, 'data-out', 0) * fpb) / (fpb * 0.5));

    const loop = el.getAttribute('data-loop');
    if (loop && t >= at) {
      const beats = (t - at) / fpb;
      const speed = num(el, 'data-speed', 1);
      if (loop === 'pulse') tf.push(`scale(${1 + 0.07 * Math.sin(beats * Math.PI * speed)})`);
      else if (loop === 'spin') tf.push(`rotate(${beats * 90 * speed}deg)`);
      else if (loop === 'float') tf.push(`translateY(${Math.sin(beats * 1.2 * speed) * 8}px)`);
      else if (loop === 'blink') opacity *= Math.floor(beats * 2 * speed) % 2 ? 0.3 : 1;
      else if (loop === 'dash') el.style.strokeDashoffset = String(-beats * 24 * speed);
      else if (loop === 'travel') {
        const path = root.querySelector<SVGGeometryElement>(el.getAttribute('data-path') ?? '');
        if (path?.getTotalLength) {
          const period = Math.max(0.25, num(el, 'data-period', 2));
          const q = el.hasAttribute('data-once') ? clamp01(beats / period) : (beats % period) / period;
          const pt = path.getPointAtLength(q * path.getTotalLength());
          tf.unshift(`translate(${pt.x}px, ${pt.y}px)`);
          if (!el.hasAttribute('data-once')) opacity *= Math.min(1, Math.sin(q * Math.PI) * 4);
        }
      }
    } else if (loop === 'travel') opacity = 0;

    el.style.opacity = String(opacity);
    el.style.transformBox = loop === 'travel' ? 'view-box' : 'fill-box';
    el.style.transformOrigin = loop === 'travel' ? '0 0' : 'center';
    el.style.transform = tf.join(' ');
    el.style.clipPath = clip;
  });
};

export const SvgScene: React.FC<{scene: SceneOf<'svg'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {enter, fpb, index} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const [markup, setMarkup] = useState<string | null>(null);
  const [handle] = useState(() => delayRender(`svg ${scene.file}`));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(staticFile(scene.file))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${scene.file}: ${r.status}`))))
      .then((text) => {
        // only the <svg> element: no XML header, no scripts
        const svg = text.slice(text.indexOf('<svg')).replace(/<script[\s\S]*?<\/script>/gi, '');
        setMarkup(svg);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, scene.file]);

  useLayoutEffect(() => {
    const root = ref.current?.querySelector('svg');
    if (!root) return;
    root.setAttribute('width', '100%');
    root.setAttribute('height', '100%');
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    poseSvg(root, frame - enter, fpb);
  }, [frame, markup, enter, fpb]);

  const vars = {
    '--accent': colors.accent,
    '--accent2': colors.accent2,
    '--fg': colors.fg,
    '--bg': colors.bg,
    '--muted': colors.muted,
    '--display': displayFamily,
    '--body': bodyFamily,
    '--mono': monoFamily,
  } as React.CSSProperties;
  const boxH = height * (scene.caption ? 0.66 : 0.8);

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 26 * u}}>
      <Sfx name="whoosh-1" at={enter} i={index} volume={0.35} />
      <div ref={ref} style={{width: width * 0.88, height: boxH, ...vars}} dangerouslySetInnerHTML={{__html: markup ?? ''}} />
      {scene.caption ? <KineticText text={scene.caption} size={64 * u} fitWidth={width * 0.84} delay={enter + Math.round(fpb * (scene.captionAt ?? 1))} weight={800} /> : null}
    </AbsoluteFill>
  );
};
