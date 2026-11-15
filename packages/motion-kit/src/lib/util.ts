import {useVideoConfig} from 'remotion';

// 1 unit = 1px on the short side of a 1080p frame. Size everything in units so
// one layout works for 16:9, 9:16 and 1:1.
export const useUnit = () => {
  const {width, height} = useVideoConfig();
  return Math.min(width, height) / 1080;
};

export const useIsPortrait = () => {
  const {width, height} = useVideoConfig();
  return height > width;
};

export const alpha = (color: string, a: number) =>
  `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

export const isDark = (hex: string) => {
  const m = hex.replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(m)) return true;
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
};

export const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;
