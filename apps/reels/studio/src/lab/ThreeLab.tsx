import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';

// Three.js via React Three Fiber (@remotion/three): every transform is a pure
// function of the frame, never of R3F's own clock (useFrame), so frames render
// correctly out of order.

const accent = '#FFE14D';
const hot = '#FF3B5C';

// The title is drawn to a canvas texture, so any font/emoji works without
// loading a 3D font file.
function useTextTexture(lines: string[], color: string, bg: string) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const g = c.getContext('2d')!;
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => {
      // shrink each line until it fits inside the card with a margin
      let size = i === 0 ? 150 : 70;
      do g.font = `900 ${size}px Montserrat, Arial, sans-serif`;
      while (g.measureText(l).width > c.width - 120 && (size -= 4) > 20);
      g.fillText(l, 512, 250 + i * 170);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [lines, color, bg]);
}

const Card: React.FC<{lines: string[]}> = ({lines}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tex = useTextTexture(lines, '#0B0B0F', accent);
  const s = spring({frame, fps, config: {damping: 12, stiffness: 90}});
  const turn = interpolate(s, [0, 1], [Math.PI * 1.5, 0]) + Math.sin(frame / 22) * 0.12;
  return (
    <group rotation={[Math.sin(frame / 30) * 0.08, turn, 0]} scale={0.4 + 0.6 * s}>
      <mesh>
        <boxGeometry args={[3.2, 2, 0.18]} />
        <meshStandardMaterial attach="material-0" color={hot} />
        <meshStandardMaterial attach="material-1" color={hot} />
        <meshStandardMaterial attach="material-2" color={hot} />
        <meshStandardMaterial attach="material-3" color={hot} />
        <meshStandardMaterial attach="material-4" map={tex} roughness={0.35} metalness={0.1} />
        <meshStandardMaterial attach="material-5" color="#111" />
      </mesh>
    </group>
  );
};

// Orbiting shapes around the card, positioned from the frame.
const Orbit: React.FC = () => {
  const frame = useCurrentFrame();
  const items = useMemo(
    () => Array.from({length: 10}, (_, i) => ({r: 2.4 + (i % 3) * 0.5, y: ((i * 37) % 9) / 3 - 1.5, ph: (i / 10) * Math.PI * 2, kind: i % 3, speed: 0.6 + (i % 4) * 0.15})),
    [],
  );
  return (
    <>
      {items.map((it, i) => {
        const a = it.ph + (frame / 30) * it.speed;
        return (
          <mesh key={i} position={[Math.cos(a) * it.r, it.y + Math.sin(a * 2) * 0.2, Math.sin(a) * it.r - 0.5]} rotation={[a, a * 1.3, 0]}>
            {it.kind === 0 ? <icosahedronGeometry args={[0.22, 0]} /> : it.kind === 1 ? <torusGeometry args={[0.18, 0.07, 12, 32]} /> : <boxGeometry args={[0.3, 0.3, 0.3]} />}
            <meshStandardMaterial color={i % 2 ? accent : hot} roughness={0.3} metalness={0.4} />
          </mesh>
        );
      })}
    </>
  );
};

export type Title3DProps = {lines: string[]};
export const Title3D: React.FC<Title3DProps> = ({lines}) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #2a2a35, #0B0B0F 70%)'}}>
      <ThreeCanvas width={width} height={height} camera={{position: [0, 0, 7.5], fov: 40}}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <pointLight position={[-4, -2, 3]} intensity={30} color={hot} />
        <Card lines={lines} />
        <Orbit />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
