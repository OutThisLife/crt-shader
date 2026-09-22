import type {TextureDataType, WebGLRenderer, WebGLRenderTarget} from 'three';
import {Pass} from 'postprocessing';
import type {CRTGPUStats, CRTOptions, CRTSize} from './three-pipeline.js';
export type {CRTGPUStats, CRTMode, CRTOptions, CRTSize} from './three-pipeline.js';

/** pmndrs composer: tone-mapped linear input; encoded screen / linear target output. */
export class CRTPass extends Pass {
  constructor(options?: CRTOptions);
  readonly inputSize: CRTSize;
  readonly stats: CRTGPUStats;
  /** Patch options; pass undefined for an override to return to its preset. */
  setOptions(options?: CRTOptions): this;
  setSize(width: number, height: number): void;
  initialize(renderer: WebGLRenderer, alpha: boolean, frameBufferType: TextureDataType): void;
  render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, outputBuffer: WebGLRenderTarget | null,
    deltaTime?: number, stencilTest?: boolean): void;
  dispose(): void;
}
