import type {ShortProps} from './types';

// Fallback when Studio opens without --props: no VO, no captures needed.
// The full dev sample (with voice) is built by `shorts sample`.
export const sampleEpisode: ShortProps = {
  episode: 0,
  sourceLabel: 'Show HN',
  series: {
    name: 'Launch Radar',
    handle: '@thelaunchradar',
    colors: {bg: '#0D0C12', fg: '#F4F1EC', muted: '#8B8794', accent: '#FFB020', accent2: '#FF3D2E'},
  },
  config: {
    brand: {
      name: 'Inkwell',
      tagline: 'Docs that write themselves',
      url: 'inkwell.dev',
      colors: {bg: '#07070c', fg: '#f5f5f7', muted: '#9a9aab', accent: '#7c5cff', accent2: '#22d3ee'},
      font: 'Inter',
      displayFont: 'SpaceGrotesk',
    },
    format: '9:16',
    fps: 30,
    bpm: 120,
    musicVolume: 0,
    sfx: false,
    sfxVolume: 0,
    look: {grain: 0.06, vignette: 0.4, lightLeaks: true, cameraDrift: true, motionBlur: false},
    scenes: [
      {type: 'hook', lines: ['Docs that *write*', 'themselves?'], beats: 5},
      {type: 'logo', style: 'assemble', beats: 5},
      {type: 'cta', headline: 'Would you *use* this?', url: 'inkwell.dev', button: 'Try it', beats: 7},
    ],
  },
  voice: [null, null, null],
  music: null,
  outro: {text: "Follow for tomorrow's launch", voice: null},
  captions: {wordsPerPage: 3},
};
