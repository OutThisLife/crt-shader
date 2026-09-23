'use client';

import { Canvas } from '@react-three/fiber';
import { EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import { ToneMappingMode } from 'postprocessing';
import { CRT } from 'crt-shader/r3f';

export default function CRTScene({ onCreated, crtRef }) {
  return (
    <Canvas
      flat frameloop="demand" dpr={1}
      camera={{ position: [0, 0, 5], fov: 40 }}
      gl={{ antialias: false, preserveDrawingBuffer: true }}
      style={{ width: '100%', aspectRatio: '8 / 5' }}
      onCreated={onCreated}
    >
      <color attach="background" args={['black']} />
      <mesh>
        <torusKnotGeometry args={[0.8, 0.25, 128, 16]} />
        <meshNormalMaterial />
      </mesh>
      <EffectComposer frameBufferType={HalfFloatType} multisampling={0}>
        <ToneMapping mode={ToneMappingMode.LINEAR} />
        <CRT ref={crtRef} preset="reference" inputResolution={160} />
      </EffectComposer>
    </Canvas>
  );
}
