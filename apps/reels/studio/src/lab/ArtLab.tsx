import React from 'react';
import {Huashu} from '../engines/Huashu';

// One huashu art style, full frame. In a 9:16 comp the 16:9 painting is
// cover-cropped; move `focusX` to keep the subject in frame.
export type ArtStyleProps = {id: string; focusX: number; fit: 'cover' | 'contain'; offset: number};
export const ArtStyle: React.FC<ArtStyleProps> = ({id, focusX, fit, offset}) => <Huashu kind="style" id={id} focusX={focusX} fit={fit} offset={offset} />;

// One explainer clip (y1 Kurzgesagt, y2 Vox, y3 whiteboard, y4 storytime,
// y5 kinetic type, t1 3Blue1Brown, t2 keynote UI, t3 finance chart) rendered
// from a spec JSON under public/, at the composition's size.
export type ExplainerProps = {spec: string};
export const Explainer: React.FC<ExplainerProps> = ({spec}) => <Huashu kind="clip" spec={spec} fit="contain" />;
