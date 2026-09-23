import * as THREE from 'three';
import {
  EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode,
} from 'postprocessing';
import { CRTPass } from 'crt-shader/postprocessing';

export function mount(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setPixelRatio(1);
  renderer.setSize(640, 400);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:auto';
  renderer.domElement.setAttribute('aria-label', 'CRT torus knot');
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');
  const camera = new THREE.PerspectiveCamera(40, 640 / 400, 0.1, 100);
  camera.position.z = 5;
  const geometry = new THREE.TorusKnotGeometry(0.8, 0.25, 128, 16);
  const material = new THREE.MeshNormalMaterial();
  scene.add(new THREE.Mesh(geometry, material));

  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType, multisampling: 0,
  });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera,
    new ToneMappingEffect({ mode: ToneMappingMode.LINEAR }),
  )); // Neutral tone mapping; CRT receives linear RGB, no OutputPass.
  composer.addPass(new CRTPass({ preset: 'reference', inputResolution: 160 }));
  composer.render(); // For animation, call this in your render loop.

  return {
    canvas: renderer.domElement,
    dispose() {
      composer.dispose(); // pmndrs also disposes its passes.
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
