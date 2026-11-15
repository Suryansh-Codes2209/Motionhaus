import {Circle, Line, Rect, Txt, makeScene2D} from '@motion-canvas/2d';
import {all, chain, easeOutBack, easeInOutCubic, waitFor} from '@motion-canvas/core';
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {MotionCanvas} from '../engines/MotionCanvas';

// A Motion Canvas scene in its own idiom: tween generators composed with
// all()/chain(). A dot grows into a card, a line draws under the title, the
// title types itself, then everything morphs to the accent colour.
const intro = (title: string) =>
  makeScene2D(function* (view) {
    view.fill('#0B0B0F');
    const dot = new Circle({size: 0, fill: '#FFE14D'});
    const card = new Rect({width: 0, height: 0, radius: 40, fill: '#FFE14D', opacity: 0});
    const txt = new Txt({text: '', fontSize: 120, fontWeight: 900, fill: '#0B0B0F', fontFamily: 'Montserrat, Arial'});
    const line = new Line({points: [[-300, 140], [300, 140]], lineWidth: 14, stroke: '#FF3B5C', lineCap: 'round', end: 0});
    view.add(card);
    view.add(dot);
    view.add(txt);
    view.add(line);

    yield* dot.size(260, 0.5, easeOutBack);
    yield* all(dot.size(0, 0.4), card.opacity(1, 0.2), card.size([860, 420], 0.6, easeOutBack));
    yield* chain(txt.text(title, 0.8), line.end(1, 0.4, easeInOutCubic));
    yield* waitFor(0.4);
    yield* all(card.fill('#FF3B5C', 0.5), txt.fill('#FFFFFF', 0.5), line.stroke('#FFE14D', 0.5), card.rotation(-4, 0.5));
    yield* waitFor(0.6);
  });

export type MotionCanvasDemoProps = {title: string};
export const MotionCanvasDemo: React.FC<MotionCanvasDemoProps> = ({title}) => (
  <AbsoluteFill>
    <MotionCanvas name={`intro-${title}`} scenes={() => [intro(title)]} />
  </AbsoluteFill>
);
