import type {WebGLRenderer, WebGLRenderTarget} from 'three';
import type {CRTPreset, CRTSettings} from './index.js';

export type CRTMode = 'crt' | 'pixelated' | 'original';
export interface CRTSize {width: number; height: number;}
export interface CRTOptions extends Partial<CRTSettings> {
  preset?: CRTPreset;
  /** Auto: 32px at a 384 CSS-pixel longest edge, rounded up in 8px steps. */
  inputResolution?: 'auto' | number;
  /** Keep the pass enabled; original bypasses preprocessing and reconstruction. */
  mode?: CRTMode;
}
export interface CRTGPUStats {
  renders: number;
  drawCalls: number;
  targetAllocations: number;
  /** Number of preparation stages in the last frame, not an accumulated count. */
  preparationPasses: number;
  inputSize: CRTSize;
  outputSize: CRTSize;
  targets: number;
  /** Null before initialization; false means RGBA8 intermediate fallback. */
  floatTargets: boolean | null;
  disposed: boolean;
}
/** Shared adapter implementation, not a separate renderer/context. */
export class CRTPipeline {
  constructor(options?: CRTOptions);
  readonly inputSize: CRTSize;
  readonly stats: CRTGPUStats;
  setOptions(options?: CRTOptions): this;
  setSize(width: number, height: number): void;
  initialize(renderer: WebGLRenderer): void;
  render(renderer: WebGLRenderer, input: WebGLRenderTarget, output: WebGLRenderTarget | null,
    color?: {linearInput?: boolean; linearOutput?: boolean}): void;
  dispose(): void;
}
