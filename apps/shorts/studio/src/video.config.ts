import {getInputProps} from 'remotion';
import {sampleEpisode} from './shorts/sample';
import type {ShortProps} from './shorts/types';
import type {LaunchConfig} from './types';

// Studio override of the template's config module: every scene and component
// imports `config` from here, so the whole motion kit is driven by the
// episode's input props (`remotion render Short --props=episode.props.json`).
const input = getInputProps() as Partial<ShortProps>;

export const episode: ShortProps = input.config ? (input as ShortProps) : sampleEpisode;

// Music is played by the Short/Long layer (ducked under the VO), not
// LaunchVideo. Shorts are always 9:16; long-form props set 16:9.
export const config: LaunchConfig = {...episode.config, format: episode.config.format === '16:9' ? '16:9' : '9:16', music: undefined};
