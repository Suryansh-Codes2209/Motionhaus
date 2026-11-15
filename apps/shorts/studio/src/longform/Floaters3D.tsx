import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';

// A Three.js backdrop: soft 3D shapes floating along the sides of the frame
// while the camera sways and dollies, so the background has real depth and
// parallax.
// Everything is computed from the frame (never R3F's useFrame clock), so
// frames render correctly out of order. Shapes stay out of the centre, where
// the scene's content sits; fog blends the far ones into the background.

type Colors = {bg: string; fg: string; accent: string; accent2: string};

const KINDS = ['ico', 'torus', 'box', 'sphere', 'octa'] as const;

const Rig: React.FC<{seed: number}> = ({seed}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {camera} = useThree();
  const t = frame / fps + seed * 10;
  // Sway ±~12° around the scene and drift in and out: the angle keeps changing.
  const yaw = Math.sin(t * 0.11) * 0.21;
  const dist = 10 - Math.sin(t * 0.07) * 1.5;
  camera.position.set(Math.sin(yaw) * dist, Math.sin(t * 0.09) * 0.9, Math.cos(yaw) * dist);
  camera.lookAt(0, 0, -2);
  return null;
};

const Shape: React.FC<{i: number; colors: Colors; seed: number}> = ({i, colors, seed}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = useMemo(() => {
    const r = (k: string) => random(`f${seed}-${i}-${k}`);
    // An ellipse around the centre (wider than tall, like the frame), pushed
    // back in depth: the middle stays clear for the content.
    const ang = (i / 14) * Math.PI * 2 + r('ang') * 0.35;
    const ring = 1 + r('ring') * 0.35;
    return {
      x: Math.cos(ang) * 7.2 * ring,
      y: Math.sin(ang) * 3.9 * ring,
      z: -1 - r('z') * 6,
      size: 0.3 + r('size') * 0.4,
      spin: 0.3 + r('spin') * 0.6,
      kind: KINDS[Math.floor(r('kind') * KINDS.length)],
      // Accent tints only: the dark ink colour reads as holes in the frame.
      color: [colors.accent, colors.accent2][Math.floor(r('col') * 2)],
      ph: r('ph') * Math.PI * 2,
    };
  }, [i, colors, seed]);
  const t = frame / fps;
  return (
    <mesh position={[p.x, p.y + Math.sin(t * 0.8 + p.ph) * 0.35, p.z]} rotation={[t * p.spin + p.ph, t * p.spin * 1.3, 0]} scale={p.size}>
      {p.kind === 'ico' ? <icosahedronGeometry args={[1, 0]} /> : p.kind === 'torus' ? <torusGeometry args={[0.8, 0.3, 16, 40]} /> : p.kind === 'box' ? <boxGeometry args={[1.3, 1.3, 1.3]} /> : p.kind === 'sphere' ? <sphereGeometry args={[0.9, 32, 32]} /> : <octahedronGeometry args={[1, 0]} />}
      <meshStandardMaterial color={p.color} roughness={0.45} metalness={0.05} transparent opacity={0.75} />
    </mesh>
  );
};

export const Floaters3D: React.FC<{colors: Colors; seed?: number; count?: number}> = ({colors, seed = 1, count = 14}) => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{fov: 40, near: 0.1, far: 60}} style={{position: 'absolute', inset: 0}}>
      <color attach="background" args={[colors.bg]} />
      <fog attach="fog" args={[colors.bg, 9, 22]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <directionalLight position={[-5, -2, -4]} intensity={0.5} color={colors.accent2} />
      <Rig seed={seed} />
      {Array.from({length: count}, (_, i) => (
        <Shape key={i} i={i} colors={colors} seed={seed} />
      ))}
    </ThreeCanvas>
  );
};
