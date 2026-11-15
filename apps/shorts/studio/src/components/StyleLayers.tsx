import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {alpha} from '../lib/util';
import {look, style} from '../styles';
import {config} from '../video.config';
import {Background} from './Background';
import {AuroraBackground, DotPattern, FlickeringGrid, Meteors, PaperTexture, RetroGrid} from './fx/backgrounds';
import {DepthStage} from './fx/depth';
import {CRT, GlitchBurst, Ripple} from './fx/screen';
import {Confetti, ToyBackdrop} from './fx/toy';
import {Flash, Grain, LightLeak, Vignette} from './Overlays';
import {ParticleBurst} from './Particles';

// The continuous backdrop under every scene, per edit style.
export const StyleBackground: React.FC = () => {
  const {bg, fg, accent, accent2} = config.brand.colors;
  switch (style.name) {
    case 'vox':
      return <PaperTexture paper={bg} ink={fg} />;
    case 'explainer':
      return (
        <AbsoluteFill style={{backgroundColor: bg}}>
          <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 45% at 50% 30%, ${alpha(accent, 0.12)}, transparent 70%)`}} />
          <DotPattern color={alpha(fg, 0.16)} />
        </AbsoluteFill>
      );
    case 'neon':
      return (
        <AbsoluteFill style={{backgroundColor: bg}}>
          <AuroraBackground bg={bg} colors={[accent, accent2, accent]} strength={0.8} />
          <RetroGrid color={alpha(accent, 0.7)} horizon={0.64} opacity={0.5} />
          <Meteors color={fg} count={10} />
        </AbsoluteFill>
      );
    case 'terminal':
      return (
        <AbsoluteFill style={{backgroundColor: bg}}>
          <FlickeringGrid color={accent} maxOpacity={0.14} />
        </AbsoluteFill>
      );
    case 'toybox':
    case 'headshot':
      return <ToyBackdrop paper={bg} accent={accent} accent2={accent2} />;
    case '3d':
      return <DepthStage bg={bg} fg={fg} accent={accent} accent2={accent2} />;
    default:
      return <Background />;
  }
};

// Finishing layers over everything (grain, vignette, scanlines).
export const StyleFinish: React.FC = () => (
  <>
    {style.name === 'terminal' ? <CRT tint={config.brand.colors.accent} /> : null}
    <Vignette amount={look.vignette} />
    <Grain amount={look.grain} />
  </>
);

// What plays on each big hit (logo reveal, stat), at absolute frame `at`.
export const StyleHit: React.FC<{at: number; index: number; fpb: number}> = ({at, index, fpb}) => {
  const {accent, accent2, fg} = config.brand.colors;
  const leakLen = Math.round(fpb * 3);
  const leak = look.lightLeaks ? (
    <Sequence from={Math.max(0, at - Math.round(fpb))} durationInFrames={leakLen}>
      <LightLeak duration={leakLen} flip={index % 2 === 1} />
    </Sequence>
  ) : null;
  const sparks =
    look.particles !== false ? (
      <Sequence from={at} durationInFrames={45}>
        <ParticleBurst seed={`hit${index}`} />
      </Sequence>
    ) : null;

  switch (style.hit) {
    case 'paper':
      return (
        <Sequence from={at} durationInFrames={14} layout="none">
          <Flash color={alpha(fg, 0.35)} />
        </Sequence>
      );
    case 'ripple':
      return (
        <Sequence from={at} durationInFrames={50}>
          <Ripple color={accent} />
        </Sequence>
      );
    case 'confetti':
      return (
        <Sequence from={at} durationInFrames={42}>
          <Confetti colors={[accent, accent2, fg]} seed={`hit${index}`} />
        </Sequence>
      );
    case 'glitch':
      return (
        <Sequence from={at - 2} durationInFrames={12}>
          <GlitchBurst colorA={accent} colorB={accent2} seed={`hit${index}`} />
        </Sequence>
      );
    case 'neon':
      return (
        <>
          <Sequence from={at} durationInFrames={14} layout="none">
            <Flash color={accent} />
          </Sequence>
          {sparks}
          {leak}
        </>
      );
    default:
      return (
        <>
          <Sequence from={at} durationInFrames={14} layout="none">
            <Flash />
          </Sequence>
          {sparks}
          {leak}
        </>
      );
  }
};
