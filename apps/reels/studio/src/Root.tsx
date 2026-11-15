import React from 'react';
import {Composition, Folder} from 'remotion';
import {ArtStyle, Explainer} from './lab/ArtLab';
import {MotionCanvasDemo} from './lab/MotionCanvasLab';
import {RiveClip} from './lab/RiveLab';
import {Title3D} from './lab/ThreeLab';
import {AnimeGrid, GsapTitle} from './lab/TimelineLab';
import {Reel} from './Reel';
import {sample} from './sample';
import type {ReelProps} from './types';

const V = {fps: 30, width: 1080, height: 1920} as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={Reel}
      defaultProps={sample}
      calculateMetadata={({props}: {props: ReelProps}) => ({durationInFrames: Math.max(1, props.durationInFrames), fps: props.fps})}
      durationInFrames={sample.durationInFrames}
      {...V}
    />
    {/* One composition per engine: preview in `npm run dev`, render with `npx remotion render <id>`. */}
    <Folder name="Lab">
      <Composition id="ArtStyle" component={ArtStyle} durationInFrames={150} {...V} defaultProps={{id: '09_postimp', focusX: 0.3, fit: 'cover' as const, offset: 0}} />
      <Composition id="ArtStyleLandscape" component={ArtStyle} durationInFrames={150} fps={30} width={1920} height={1080} defaultProps={{id: '28_monet', focusX: 0.5, fit: 'cover' as const, offset: 0}} />
      <Composition id="Explainer" component={Explainer} durationInFrames={210} fps={30} width={1920} height={1080} defaultProps={{spec: 'huashu/examples/t3_finance_chart.json'}} />
      <Composition id="GsapTitle" component={GsapTitle} durationInFrames={90} {...V} defaultProps={{title: 'MOTIONHAUS', subtitle: 'GSAP, frame-exact'}} />
      <Composition id="AnimeGrid" component={AnimeGrid} durationInFrames={90} {...V} defaultProps={{label: 'ANIME.JS'}} />
      <Composition id="Title3D" component={Title3D} durationInFrames={120} {...V} defaultProps={{lines: ['THREE.JS', 'in Remotion']}} />
      <Composition id="MotionCanvas" component={MotionCanvasDemo} durationInFrames={120} {...V} defaultProps={{title: 'NO NICHE'}} />
      <Composition id="Rive" component={RiveClip} durationInFrames={120} {...V} defaultProps={{file: 'rope.riv', fit: 'contain' as const}} />
    </Folder>
  </>
);
