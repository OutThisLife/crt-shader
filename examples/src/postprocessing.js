import { HalfFloatType } from 'three';
import { EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { CRTPass } from 'crt-shader/postprocessing';
import { createRenderer, createScene } from './scene.js';

export async function mount({ source, host, preset }) {
  const renderer = createRenderer(host);
  const content = createScene(source);
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
  composer.addPass(new RenderPass(content.scene, content.camera));
  // pmndrs feeds tone-mapped LINEAR pixels to CRT, not native Three's encoded input.
  composer.addPass(new EffectPass(content.camera, new ToneMappingEffect({ mode: ToneMappingMode.LINEAR })));
  const crt = new CRTPass({ preset, inputResolution: source.width });
  composer.addPass(crt);
  composer.render();
  return { canvas: renderer.domElement, renderer, composer, crt, scene: content.scene, camera: content.camera, dispose() {
    composer.dispose(); content.dispose(); renderer.dispose();
  } };
}
