import {Pass} from 'postprocessing';
import {CRTPipeline} from './three-pipeline.js';

/** pmndrs pass: tone-mapped linear input, encoded screen / linear target output. */
export class CRTPass extends Pass {
  constructor(options = {}) {
    super('CRTPass');
    this.pipeline = new CRTPipeline(options);
  }
  setOptions(options) { this.pipeline.setOptions(options); return this; }
  setSize(width, height) { this.pipeline.setSize(width, height); }
  initialize(renderer, alpha, frameBufferType) { this.pipeline.initialize(renderer); }
  get inputSize() { return this.pipeline.inputSize; }
  get stats() { return this.pipeline.stats; }
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest = false) {
    if (stencilTest) throw new Error('CRTPass does not support composer stencil masks.');
    this.pipeline.render(renderer, inputBuffer, this.renderToScreen ? null : outputBuffer, {
      linearInput: true, linearOutput: !this.renderToScreen,
    });
  }
  dispose() { this.pipeline.dispose(); }
}
