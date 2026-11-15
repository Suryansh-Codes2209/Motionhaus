// Colour themes that rotate between episodes so the feed doesn't look like
// one template on repeat. The rocket mark, badge layout and outro stay fixed,
// so the channel still reads as one series.

/** @typedef {{bg: string, fg: string, muted: string, accent: string, accent2: string}} Palette */

/** @type {Record<string, Palette>} */
export const PALETTES = {
  ember: {bg: '#0D0C12', fg: '#F4F1EC', muted: '#8B8794', accent: '#FFB020', accent2: '#FF3D2E'},
  signal: {bg: '#06110C', fg: '#EDFFF5', muted: '#83A394', accent: '#3DFFA2', accent2: '#00C2FF'},
  ultraviolet: {bg: '#0E0918', fg: '#F6F0FF', muted: '#A399BD', accent: '#C47CFF', accent2: '#FF4FD8'},
  ice: {bg: '#06101A', fg: '#EEF6FF', muted: '#8AA0B8', accent: '#5AC8FF', accent2: '#7C6CFF'},
  paper: {bg: '#F4EFE6', fg: '#16130F', muted: '#6E655A', accent: '#E5484D', accent2: '#F59E0B'},
  // Style palettes (styles.mjs): not in the rotation, picked by edit style.
  newsprint: {bg: '#EFE6D2', fg: '#1A1712', muted: '#6B6152', accent: '#FFD43B', accent2: '#E03A2F'}, // vox: marker yellow, red pen
  chalk: {bg: '#F4F6FA', fg: '#0F172A', muted: '#64748B', accent: '#2563EB', accent2: '#14B8A6'}, // explainer
  phosphor: {bg: '#050806', fg: '#D7FFE4', muted: '#6E8F7A', accent: '#39FF7A', accent2: '#FFB000'}, // terminal
  toybox: {bg: '#F3EFE8', fg: '#1C1A17', muted: '#8A847B', accent: '#E8572A', accent2: '#FFC83D'}, // toybox, headshot: cream paper, orange, sticker yellow
  depth: {bg: '#0A0C14', fg: '#F1F3FA', muted: '#8E95AB', accent: '#FF6A3D', accent2: '#6C8CFF'}, // 3d: dark stage, hot orange, cool edge light
};

export const PALETTE_ORDER = ['ember', 'signal', 'ultraviolet', 'ice', 'paper'];

/** Palette for an episode: explicit name, else rotate by episode number. @param {number} episode @param {string} [name] */
export function paletteFor(episode, name) {
  if (name) {
    const p = PALETTES[name];
    if (!p) throw new Error(`unknown palette "${name}" (have: ${Object.keys(PALETTES).join(', ')})`);
    return {name, ...p};
  }
  const n = PALETTE_ORDER[(Math.max(1, episode) - 1) % PALETTE_ORDER.length];
  return {name: n, ...PALETTES[n]};
}
