import type {LaunchConfig} from './types';

// The single source of truth for the video. The launch-video skill rewrites
// this file from the captured website; everything else reads from it.
export const config: LaunchConfig = {
  brand: {
    name: 'Lumen',
    tagline: 'Analytics that explain themselves',
    url: 'lumen.app',
    logo: undefined,
    colors: {
      bg: '#07070c',
      fg: '#f5f5f7',
      muted: '#9a9aab',
      accent: '#7c5cff',
      accent2: '#22d3ee',
    },
    font: 'Inter',
    displayFont: 'SpaceGrotesk',
  },
  format: '16:9',
  fps: 30,
  bpm: 120,
  music: 'audio/music.mp3',
  musicVolume: 0.5,
  sfx: true,
  sfxVolume: 0.8,
  look: {
    grain: 0.07,
    vignette: 0.45,
    lightLeaks: true,
    cameraDrift: true,
    motionBlur: true,
    particles: true,
  },
  scenes: [
    {type: 'hook', lines: ['Dashboards everywhere.', 'Answers *nowhere.*'], beats: 6},
    {type: 'logo', beats: 5},
    {
      type: 'screenshot',
      image: 'site/hero.png',
      caption: 'Ask in plain English. *Get the chart.*',
      beats: 8,
    },
    {
      type: 'features',
      title: 'Built for *speed*',
      items: [
        {icon: '⚡', title: 'Instant', desc: 'Sub-second queries'},
        {icon: '🧠', title: 'Explained', desc: 'Every number, annotated'},
        {icon: '🔒', title: 'Private', desc: 'Your data stays yours'},
      ],
      beats: 8,
    },
    {type: 'stat', value: 10, suffix: '×', label: 'faster to insight', beats: 5},
    {
      type: 'cta',
      headline: 'Start free *today*',
      url: 'lumen.app',
      button: 'Get started',
      beats: 8,
    },
  ],
};
