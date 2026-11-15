import {CameraMotionBlur} from '@remotion/motion-blur';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {SoundTrack} from './audio/SoundTrack';
import {CameraRig} from './components/CameraRig';
import {SceneCamera} from './components/SceneCamera';
import {SplitPanel} from './components/SplitPanel';
import {StyleBackground, StyleFinish, StyleHit} from './components/StyleLayers';
import {bodyFamily} from './fonts';
import {SceneContext} from './lib/SceneContext';
import {Chart} from './scenes/Chart';
import {Chat} from './scenes/Chat';
import {Code} from './scenes/Code';
import {Comment} from './scenes/Comment';
import {Cta} from './scenes/Cta';
import {Features} from './scenes/Features';
import {Hook} from './scenes/Hook';
import {Logo} from './scenes/Logo';
import {Quote} from './scenes/Quote';
import {Screenshot} from './scenes/Screenshot';
import {Spotlight} from './scenes/Spotlight';
import {Stat} from './scenes/Stat';
import {Steps} from './scenes/Steps';
import {TypeScene} from './scenes/TypeScene';
import {Art} from './scenes/Art';
import {Bento} from './scenes/Bento';
import {Clip} from './scenes/Clip';
import {Clipping} from './scenes/Clipping';
import {DocumentScene} from './scenes/DocumentScene';
import {Flow} from './scenes/Flow';
import {Log} from './scenes/Log';
import {Stack} from './scenes/Stack';
import {Photo} from './scenes/Photo';
import {Crack} from './scenes/Crack';
import {SvgScene} from './scenes/Svg';
import {SpaceScene} from './scenes/Space';
import {SceneFx} from './components/fx/sceneFx';
import {Tiles} from './scenes/Tiles';
import {Versus} from './scenes/Versus';
import {Orbit3D} from './components/fx/depth';
import {look, style} from './styles';
import {getTimeline} from './timeline';
import {getPresentation} from './transitions';
import type {Scene} from './types';
import {config} from './video.config';

const SceneView: React.FC<{scene: Scene}> = ({scene}) => {
  switch (scene.type) {
    case 'hook':
      return <Hook scene={scene} />;
    case 'logo':
      return <Logo scene={scene} />;
    case 'screenshot':
      return <Screenshot scene={scene} />;
    case 'features':
      return <Features scene={scene} />;
    case 'stat':
      return <Stat scene={scene} />;
    case 'quote':
      return <Quote scene={scene} />;
    case 'cta':
      return <Cta scene={scene} />;
    case 'type':
      return <TypeScene scene={scene} />;
    case 'spotlight':
      return <Spotlight scene={scene} />;
    case 'code':
      return <Code scene={scene} />;
    case 'chart':
      return <Chart scene={scene} />;
    case 'steps':
      return <Steps scene={scene} />;
    case 'chat':
      return <Chat scene={scene} />;
    case 'comment':
      return <Comment scene={scene} />;
    case 'versus':
      return <Versus scene={scene} />;
    case 'clipping':
      return <Clipping scene={scene} />;
    case 'document':
      return <DocumentScene scene={scene} />;
    case 'flow':
      return <Flow scene={scene} />;
    case 'bento':
      return <Bento scene={scene} />;
    case 'log':
      return <Log scene={scene} />;
    case 'art':
      return <Art scene={scene} />;
    case 'clip':
      return <Clip scene={scene} />;
    case 'tiles':
      return <Tiles scene={scene} />;
    case 'stack':
      return <Stack scene={scene} />;
    case 'photo':
      return <Photo scene={scene} />;
    case 'crack':
      return <Crack scene={scene} />;
    case 'svg':
      return <SvgScene scene={scene} />;
    case 'space':
      return <SpaceScene scene={scene} />;
  }
};

export const LaunchVideo: React.FC = () => {
  const tl = getTimeline(config);

  // TransitionSeries needs a flat list of Sequence/Transition children.
  const children: React.ReactNode[] = [];
  tl.items.forEach((it) => {
    if (it.index > 0) {
      const presentation = getPresentation(it.scene.transition, it.index, it.scene.maskWord);
      children.push(
        <TransitionSeries.Transition
          key={`t${it.index}`}
          timing={linearTiming({
            durationInFrames: tl.T,
            easing: Easing.bezier(0.83, 0, 0.17, 1),
          })}
          {...(presentation ? {presentation} : {})}
        />,
      );
    }
    children.push(
      <TransitionSeries.Sequence key={`s${it.index}`} durationInFrames={it.duration}>
        <SceneContext.Provider
          value={{index: it.index, fpb: tl.fpb, enter: it.enter, duration: it.duration}}
        >
          <SceneFx scene={it.scene}>
            {look.sceneCamera ? (
              <SceneCamera scene={it.scene}>
                <SceneView scene={it.scene} />
              </SceneCamera>
            ) : style.orbit ? (
              <Orbit3D duration={it.duration} index={it.index}>
                <SceneView scene={it.scene} />
              </Orbit3D>
            ) : (
              <SceneView scene={it.scene} />
            )}
          </SceneFx>
        </SceneContext.Provider>
      </TransitionSeries.Sequence>,
    );
  });

  const series = <TransitionSeries>{children}</TransitionSeries>;

  const film = (
    <>
      {look.backdrop === false || style.layout === 'split' ? null : <StyleBackground />}
      <CameraRig shakes={tl.hits}>
        {look.motionBlur ? (
          <CameraMotionBlur samples={6} shutterAngle={180}>
            {series}
          </CameraMotionBlur>
        ) : (
          series
        )}
      </CameraRig>
      {tl.hits.map((h, i) => (
        <StyleHit key={h} at={h} index={i} fpb={tl.fpb} />
      ))}
      <StyleFinish />
    </>
  );

  return (
    <AbsoluteFill style={{fontFamily: bodyFamily}}>
      {style.layout === 'split' ? <SplitPanel>{film}</SplitPanel> : film}
      <SoundTrack tl={tl} />
    </AbsoluteFill>
  );
};
