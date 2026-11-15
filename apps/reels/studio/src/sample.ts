import type {ReelProps} from './types';

// Studio placeholder only; real renders always pass --props=<reel>/props.json.
export const sample: ReelProps = {
  fps: 30,
  durationInFrames: 90,
  video: 'source.mp4',
  handle: '@handle',
  theme: {font: 'Montserrat', accent: '#FFE14D', accent2: '#FF3B5C', ink: '#0B0B0F', paper: '#FFFFFF'},
  focus: {x: 0.5, y: 0.38},
  segments: [],
  zooms: [{frame: 0, scale: 1}],
  captions: [{from: 0, to: 60, words: [{text: 'sample', from: 0, emphasis: false}, {text: 'reel', from: 20, emphasis: true}]}],
  hideCaptions: [],
  overlays: [],
  outro: {from: 60, dur: 30, title: 'Follow for more', cta: 'FOLLOW'},
  music: null,
  sfx: [],
};
