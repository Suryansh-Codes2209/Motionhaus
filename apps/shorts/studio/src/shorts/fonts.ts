import {loadFont as spaceGrotesk} from '@remotion/google-fonts/SpaceGrotesk';

// Launch Radar's own type (badge, captions, outro), independent of the
// featured product's brand font.
export const seriesFamily = spaceGrotesk('normal', {subsets: ['latin'], weights: ['500', '700']}).fontFamily;
