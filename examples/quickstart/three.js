import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CRTPass } from 'crt-shader/three';

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

  const composer = new EffectComposer(renderer);
  const render = new RenderPass(scene, camera);
  const output = new OutputPass();
  const crt = new CRTPass({ preset: 'reference', inputResolution: 160 });
  composer.addPass(render);
  composer.addPass(output); // Tone map and encode before native CRT.
  composer.addPass(crt); // Last: do not encode again.
  composer.render(); // For animation, call this in your render loop.

  return {
    canvas: renderer.domElement,
    dispose() {
      crt.dispose();
      output.dispose();
      render.dispose();
      composer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
