import type React from 'react';
import {alpha, isDark} from '../lib/util';
import type {FontName, LaunchConfig, StyleName, TransitionName} from '../types';
import {config} from '../video.config';

type Colors = LaunchConfig['brand']['colors'];

// How an emphasised *word* is painted: accent gradient, marker swipe behind
// it, solid accent, an animated shimmer, or an italic serif in the accent.
export type EmphasisKind = 'gradient' | 'marker' | 'solid' | 'shimmer' | 'serif';

// What happens on a big hit (logo reveal, stat): film flash + sparks, a paper
// flash, a soft ripple, a neon burst, an RGB glitch, or soft toy confetti.
export type HitKind = 'film' | 'paper' | 'ripple' | 'neon' | 'glitch' | 'confetti';

export type StyleDef = {
  name: StyleName;
  // Fonts the style imposes; undefined keeps the brand's own fonts.
  fonts?: {display: FontName; body: FontName};
  label: 'JetBrainsMono' | 'CourierPrime' | 'IBMPlexMono'; // chips, captions, typewriter labels
  emphasis: EmphasisKind;
  hit: HitKind;
  transitions: TransitionName[]; // default rotation into each scene
  card: (c: Colors, u: number) => React.CSSProperties; // GlassCard / tiles / panels
  sheen: boolean; // light sweep across cards as they land
  tilt: number; // max degrees of rotation on cards (paper cut-outs feel hand-placed)
  look: Partial<LaunchConfig['look']>; // defaults under the config's own look
  // 'split': scenes play in the top panel and the host composition draws a
  // talking head under them (headshot). Default: scenes fill the frame.
  layout?: 'full' | 'split';
  orbit?: boolean; // every scene sits in perspective under a slow camera orbit (3d)
};

const radar: StyleDef = {
  name: 'radar',
  label: 'JetBrainsMono',
  emphasis: 'gradient',
  hit: 'film',
  transitions: ['zoomPunch', 'pushCut', 'slideLeft', 'zoomPunch', 'wipe', 'slideUp'],
  card: (c, u) => {
    const dark = isDark(c.bg);
    return {
      borderRadius: 28 * u,
      background: dark ? alpha(c.fg, 0.06) : 'rgba(255,255,255,0.7)',
      border: `${1.5 * u}px solid ${alpha(c.fg, dark ? 0.14 : 0.1)}`,
      backdropFilter: 'blur(24px)',
      boxShadow: `0 ${30 * u}px ${80 * u}px rgba(0,0,0,${dark ? 0.35 : 0.12})`,
    };
  },
  sheen: true,
  tilt: 0,
  look: {},
};

// Vox-style explainer: newsprint paper, cut-out screenshots, marker pens,
// typewriter labels. Hand-made, editorial, slower.
const vox: StyleDef = {
  name: 'vox',
  fonts: {display: 'PlayfairDisplay', body: 'Inter'},
  label: 'CourierPrime',
  emphasis: 'marker',
  hit: 'paper',
  transitions: ['paper', 'wipe', 'paper', 'slideLeft'],
  card: (c, u) => ({
    borderRadius: 4 * u,
    background: isDark(c.bg) ? alpha(c.fg, 0.08) : '#FFFDF7',
    border: `${3 * u}px solid ${c.fg}`,
    boxShadow: `${10 * u}px ${12 * u}px 0 ${alpha(c.fg, 0.9)}`,
  }),
  sheen: false,
  tilt: 1.6,
  look: {grain: 0.1, vignette: 0.18, lightLeaks: false, particles: false},
};

// Clean explainer: calm dotted canvas, crisp cards, beams between ideas.
const explainer: StyleDef = {
  name: 'explainer',
  fonts: {display: 'Geist', body: 'Inter'},
  label: 'JetBrainsMono',
  emphasis: 'solid',
  hit: 'ripple',
  transitions: ['blur', 'slideUp', 'blur', 'slideLeft'],
  card: (c, u) => {
    const dark = isDark(c.bg);
    return {
      borderRadius: 24 * u,
      background: dark ? alpha(c.fg, 0.05) : '#FFFFFF',
      border: `${2 * u}px solid ${alpha(c.fg, dark ? 0.12 : 0.08)}`,
      boxShadow: `0 ${18 * u}px ${50 * u}px ${alpha(dark ? '#000000' : c.fg, dark ? 0.35 : 0.08)}`,
    };
  },
  sheen: false,
  tilt: 0,
  look: {grain: 0.03, vignette: 0.15, lightLeaks: false, particles: false, cameraDrift: true},
};

// Neon UI: the 21st.dev / modern-SaaS look. Aurora, retro grid, beams
// orbiting card borders, shimmering headlines.
const neon: StyleDef = {
  name: 'neon',
  fonts: {display: 'Unbounded', body: 'Geist'},
  label: 'JetBrainsMono',
  emphasis: 'shimmer',
  hit: 'neon',
  transitions: ['zoomPunch', 'slideUp', 'pushCut', 'zoomPunch', 'slideLeft'],
  card: (c, u) => ({
    borderRadius: 30 * u,
    background: `linear-gradient(160deg, ${alpha(c.fg, 0.09)}, ${alpha(c.fg, 0.02)})`,
    border: `${1.5 * u}px solid ${alpha(c.fg, 0.12)}`,
    backdropFilter: 'blur(20px)',
    boxShadow: `0 0 ${60 * u}px ${alpha(c.accent, 0.12)}, inset 0 ${1 * u}px 0 ${alpha(c.fg, 0.15)}`,
  }),
  sheen: true,
  tilt: 0,
  look: {grain: 0.05, vignette: 0.45, lightLeaks: true, particles: true},
};

// Terminal / hacker: phosphor on black, CRT scanlines, square boxes, glitch cuts.
const terminal: StyleDef = {
  name: 'terminal',
  fonts: {display: 'IBMPlexMono', body: 'IBMPlexMono'},
  label: 'IBMPlexMono',
  emphasis: 'solid',
  hit: 'glitch',
  transitions: ['glitch', 'none', 'glitch', 'wipe'],
  card: (c, u) => ({
    borderRadius: 2 * u,
    background: alpha(c.bg, 0.85),
    border: `${2 * u}px solid ${alpha(c.accent, 0.7)}`,
    boxShadow: `0 0 ${24 * u}px ${alpha(c.accent, 0.25)}, inset 0 0 ${30 * u}px ${alpha(c.accent, 0.06)}`,
  }),
  sheen: false,
  tilt: 0,
  look: {grain: 0.04, vignette: 0.55, lightLeaks: false, particles: false, cameraDrift: false},
};

// Toy box: soft app-icon tiles on cream paper, an orange accent, italic serif
// emphasis, stickers and bouncy pops. Friendly, tactile, "look how easy".
const toyCard = (c: Colors, u: number): React.CSSProperties => {
  const dark = isDark(c.bg);
  return {
    borderRadius: 40 * u,
    background: dark ? alpha(c.fg, 0.08) : '#FFFFFF',
    border: `${1.5 * u}px solid ${alpha(c.fg, dark ? 0.12 : 0.06)}`,
    boxShadow: `0 ${2 * u}px ${3 * u}px ${alpha(c.fg, 0.06)}, 0 ${24 * u}px ${60 * u}px ${alpha(dark ? '#000000' : c.fg, dark ? 0.4 : 0.1)}`,
  };
};
const toybox: StyleDef = {
  name: 'toybox',
  fonts: {display: 'InstrumentSerif', body: 'Inter'},
  label: 'JetBrainsMono',
  emphasis: 'serif',
  hit: 'confetti',
  transitions: ['pop', 'slideUp', 'pop', 'slideLeft'],
  card: toyCard,
  sheen: false,
  tilt: 0,
  look: {grain: 0.03, vignette: 0.08, lightLeaks: false, particles: false, cameraDrift: true},
};

// 3D: a dark stage where every card has thickness, scenes sit in perspective
// under a slow orbit, and cuts turn like the faces of a cube.
const depth: StyleDef = {
  name: '3d',
  fonts: {display: 'Sora', body: 'Inter'},
  label: 'JetBrainsMono',
  emphasis: 'gradient',
  hit: 'neon',
  transitions: ['flip', 'zoomPunch', 'flip', 'pushCut'],
  card: (c, u) => ({
    borderRadius: 30 * u,
    background: `linear-gradient(165deg, ${alpha(c.fg, 0.14)}, ${alpha(c.fg, 0.04)} 60%)`,
    border: `${1.5 * u}px solid ${alpha(c.fg, 0.18)}`,
    backdropFilter: 'blur(18px)',
    // stacked hard shadows read as the card's edge, a soft one as its cast shadow
    boxShadow: [1, 2, 3, 4, 5, 6].map((i) => `0 ${i * 2 * u}px 0 ${alpha(c.accent2, 0.22 - i * 0.025)}`).join(', ') + `, 0 ${50 * u}px ${90 * u}px rgba(0,0,0,0.55)`,
  }),
  sheen: true,
  tilt: 0,
  look: {grain: 0.04, vignette: 0.5, lightLeaks: false, particles: true, cameraDrift: false},
  orbit: true,
};

// Headshot: the talking-head split. Toy-box panels in the top half, the
// speaker (a recorded take, or the Rado host) in the bottom half, captions
// riding on the face.
const headshot: StyleDef = {
  ...toybox,
  name: 'headshot',
  transitions: ['pop', 'slideLeft', 'pop', 'slideUp'],
  look: {...toybox.look, cameraDrift: false},
  layout: 'split',
};

export const STYLES: Record<StyleName, StyleDef> = {radar, vox, explainer, neon, terminal, toybox, '3d': depth, headshot};

// config is fixed for a render, so the active style is a module constant.
export const style: StyleDef = STYLES[config.style ?? 'radar'] ?? radar;

// Finishing layers: a non-radar style sets its own grain/vignette/leaks/particles
// over the config's (they are part of the look); motionBlur always comes from config.
export const look: LaunchConfig['look'] = {...config.look, ...(style.name === 'radar' ? {} : style.look), motionBlur: config.look.motionBlur};

// Deterministic small rotation per item, for hand-placed paper.
export const tiltFor = (i: number) => (style.tilt ? (((i * 7919) % 5) - 2) * (style.tilt / 2) : 0);

// Fill for accent chips, icons and buttons: a gradient for the glossy
// styles, flat ink for paper, terminal and the toy-box looks.
export const accentFill = (angle = 135) => {
  const {accent, accent2} = config.brand.colors;
  return style.name === 'vox' || style.name === 'terminal' || style.emphasis === 'serif' ? accent : `linear-gradient(${angle}deg, ${accent}, ${accent2})`;
};

// Text colour on an accentFill surface (buttons, active chips).
export const onAccent = () => {
  const {fg, bg} = config.brand.colors;
  return style.name === 'vox' ? fg : style.name === 'terminal' ? bg : '#ffffff';
};
