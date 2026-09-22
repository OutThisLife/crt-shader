import type {WebGLRenderer, WebGLRenderTarget} from 'three';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import type {CRTGPUStats, CRTOptions, CRTSize} from './three-pipeline.js';
export type {CRTGPUStats, CRTMode, CRTOptions, CRTSize} from './three-pipeline.js';

/** Three.js examples composer: display-encoded input and output, after OutputPass. */
export class CRTPass extends Pass {
  constructor(options?: CRTOptions);
  readonly inputSize: CRTSize;
  readonly stats: CRTGPUStats;
  /** Patch options; pass undefined for an override to return to its preset. */
  setOptions(options?: CRTOptions): this;
  setSize(width: number, height: number): void;
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget | null,
    readBuffer: WebGLRenderTarget, deltaTime?: number, maskActive?: boolean): void;
  dispose(): void;
}
