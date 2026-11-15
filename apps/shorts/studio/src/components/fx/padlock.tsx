import React from 'react';

// A metal padlock: gold body with a keyhole, steel shackle. open: 0 = locked,
// 1 = shackle sprung up and swung out. Used by the crack scene and thumbnails.
export const Padlock: React.FC<{width: number; open?: number; id?: string; shadow?: string}> = ({width, open = 0, id = 'pl', shadow}) => {
  const lift = open * 0.32 * 200;
  return (
    <svg width={width} height={width * 1.25} viewBox="0 0 200 250" style={{overflow: 'visible', filter: shadow}}>
      <defs>
        <linearGradient id={`${id}-shackle`} x1="0" x2="1">
          <stop offset="0" stopColor="#8A8F98" />
          <stop offset="0.45" stopColor="#F2F4F7" />
          <stop offset="1" stopColor="#6B7079" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#F5C842" />
          <stop offset="0.5" stopColor="#D49B1E" />
          <stop offset="1" stopColor="#8E6410" />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${-lift}) rotate(${open * -14} 152 120)`}>
        <path d="M48 120 V70 a52 52 0 0 1 104 0 V120" fill="none" stroke={`url(#${id}-shackle)`} strokeWidth="22" strokeLinecap="round" />
      </g>
      <rect x="18" y="110" width="164" height="130" rx="22" fill={`url(#${id}-body)`} />
      <rect x="18" y="110" width="164" height="16" rx="8" fill="rgba(255,255,255,0.25)" />
      <circle cx="100" cy="162" r="15" fill="#2A1E05" />
      <path d="M93 168 L107 168 L103 200 L97 200 Z" fill="#2A1E05" />
    </svg>
  );
};
