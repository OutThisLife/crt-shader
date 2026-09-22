/** Scalar settings shared by every preset and by CRTImage's direct props. */
export interface CRTSettings {
  spread: number;
  bleed: number;
  gamma: number;
  beam: number;
  bloom: number;
  glow: number;
  focus: number;
  mask: number;
  exposure: number;
  /** Pixel height / width; React applies this to pixel-mode layout, not photos. */
  aspect: number;
  outputGamma: number;
  cameraBlur: number;
  blackLevel: number;
  redGain: number;
  greenGain: number;
  blueGain: number;
  maskPitch: number;
  maskPhase: number;
  slot: number;
  slotPhase: number;
  maskSlant: number;
  beamTilt: number;
  maskWarp: number;
  rg: number;
  rb: number;
  gr: number;
  gb: number;
  br: number;
  bg: number;
}

export type CRTPreset = 'reference' | 'clean' | 'soft' | 'photoSoft';
export type CRTSource = HTMLCanvasElement | HTMLImageElement;
export type CRTSourceVersion = number | string;
export type CRTInputMode = 'pixel' | 'photo';
export const PRESETS: Readonly<Record<CRTPreset, Readonly<CRTSettings>>>;

export interface CRTInputOptions {
  inputMode?: CRTInputMode;
  /** Longest edge of the genuinely downsampled photo texture; default 96. */
  inputResolution?: number;
}
export interface CRTView {
  origin: [number, number];
  size: [number, number];
}
export interface CRTRendererOptions {
  cacheBytes?: number;
  targetBytes?: number;
  sourceBytes?: number;
}
export interface CRTRuntimeOptions extends CRTRendererOptions {
  /** CPU submission budget per animation frame, in milliseconds; default 8. */
  frameBudget?: number;
  /** Decoded-image cache byte limit; default 16 MiB. */
  imageBytes?: number;
}
export interface CRTRendererStats {
  renders: number;
  cacheHits: number;
  drawCalls: number;
  sourceUploads: number;
  targetAllocations: number;
  cacheBytes: number;
  targetBytes: number;
  sourceBytes: number;
}
export interface CRTRuntimeStats extends CRTRendererStats {
  queued: number;
  contexts: number;
  imageBytes: number;
  disposed: boolean;
}
export interface CRTRenderOptions {
  width?: number;
  height?: number;
  view?: CRTView | null;
  /** Omit in low-level renders for mutable/uncached input. */
  sourceVersion?: CRTSourceVersion;
}
export interface CRTRenderResult {
  width: number;
  height: number;
}
export interface CRTRuntimeRenderOptions extends CRTRenderOptions {
  source: CRTSource;
  output: HTMLCanvasElement;
  preset?: CRTPreset;
  settings?: Partial<CRTSettings>;
  signal?: AbortSignal;
}
export interface CRTImageLoadOptions {
  crossOrigin?: 'anonymous' | 'use-credentials' | null;
}
export interface CRTRuntime {
  loadImage(url: string, options?: CRTImageLoadOptions): Promise<HTMLImageElement>;
  /** Physical output pixels. Pending requests for the same canvas are latest-wins. */
  render(options: CRTRuntimeRenderOptions): Promise<CRTRenderResult>;
  invalidate(source: CRTSource): void;
  dispose(): void;
  readonly stats: Readonly<CRTRuntimeStats>;
}
export interface CRTRuntimeLease {
  runtime: CRTRuntime;
  release(): void;
}

/** Browser-only construction; importing this class is safe during SSR. */
export class CRTRenderer {
  constructor(options?: CRTRendererOptions);
  readonly stats: Readonly<CRTRendererStats>;
  render(source: CRTSource, output: HTMLCanvasElement, settings: CRTSettings, options?: CRTRenderOptions): void;
  invalidate(source: CRTSource): void;
  dispose(): void;
}
export function resolveSettings(preset?: CRTPreset, overrides?: Partial<CRTSettings>): CRTSettings;
export function downsamplePhoto(image: CRTSource, resolution: number): HTMLCanvasElement;
export function prepareInput(image: CRTSource, options?: CRTInputOptions): HTMLCanvasElement;
export function createRuntime(options?: CRTRuntimeOptions): CRTRuntime;
/** Browser-only, shared context with delayed, ref-counted disposal. Release exactly once. */
export function acquireRuntime(): CRTRuntimeLease;
