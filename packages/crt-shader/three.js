import {Pass} from 'three/addons/postprocessing/Pass.js';
import {CRTPipeline} from './three-pipeline.js';

/** Native Three.js pass: RenderPass -> OutputPass -> CRTPass (terminal). */
export class CRTPass extends Pass {
  constructor(options = {}) {
    super();
    this.pipeline = new CRTPipeline(options);
  }
  setOptions(options) { this.pipeline.setOptions(options); return this; }
  setSize(width, height) { this.pipeline.setSize(width, height); }
  get inputSize() { return this.pipeline.inputSize; }
  get stats() { return this.pipeline.stats; }
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive = false) {
    if (maskActive) throw new Error('CRTPass does not support composer stencil masks.');
    this.pipeline.render(renderer, readBuffer, this.renderToScreen ? null : writeBuffer);
  }
  dispose() { this.pipeline.dispose(); }
}
