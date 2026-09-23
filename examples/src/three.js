import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CRTPass } from 'crt-shader/three';
import { createRenderer, createScene } from './scene.js';

export async function mount({ source, host, preset }) {
  const renderer = createRenderer(host);
  const content = createScene(source);
  const composer = new EffectComposer(renderer);
  const render = new RenderPass(content.scene, content.camera);
  const output = new OutputPass();
  const crt = new CRTPass({ preset, inputResolution: source.width });
  composer.addPass(render);
  composer.addPass(output); // Tone map + encode before the native CRT pass.
  composer.addPass(crt); // Terminal: do not encode a second time afterward.
  composer.render();
  return { canvas: renderer.domElement, renderer, composer, crt, scene: content.scene, camera: content.camera, dispose() {
    crt.dispose(); output.dispose(); render.dispose(); composer.dispose();
    content.dispose(); renderer.dispose();
  } };
}
