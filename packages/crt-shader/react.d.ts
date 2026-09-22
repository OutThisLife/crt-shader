import type { CSSProperties, ReactElement } from 'react';
import type {
  CRTInputMode, CRTPreset, CRTRenderResult, CRTSettings, CRTSource, CRTSourceVersion, CRTView,
} from './index.js';

export interface CRTImageLoadResult extends CRTRenderResult {
  canvas: HTMLCanvasElement;
  /** The decoded original, before optional photo downsampling. */
  source: CRTSource;
}

export interface CRTImageProps extends Partial<CRTSettings> {
  /** URLs require same-origin access or appropriate image-server CORS headers. */
  src: string | CRTSource;
  /** Change after painting new pixels into a mutable source canvas. Default 0. */
  sourceVersion?: CRTSourceVersion;
  preset?: CRTPreset;
  inputMode?: CRTInputMode;
  inputResolution?: number;
  /** CSS pixels. Omit one dimension to retain the input's corrected aspect ratio. */
  width?: number;
  height?: number;
  /** Physical pixels per CSS pixel; defaults to devicePixelRatio capped at 2. */
  dpr?: number;
  /** Generic crop in prepared source pixels; omit to show the whole image. */
  view?: CRTView | null;
  /** Eager is the default. Lazy waits for IntersectionObserver visibility. */
  loading?: 'eager' | 'lazy';
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Called after each successful render, including effect-setting updates. */
  onLoad?: (result: CRTImageLoadResult) => void;
  onError?: (error: Error) => void;
}

export function CRTImage(props: CRTImageProps): ReactElement;
