import type {ForwardRefExoticComponent, RefAttributes} from 'react';
import type {CRTPass} from './postprocessing.js';
import type {CRTOptions} from './three-pipeline.js';
export type {CRTGPUStats, CRTMode, CRTOptions, CRTSize} from './three-pipeline.js';

/** A terminal child of @react-three/postprocessing's EffectComposer. */
export interface CRTProps extends CRTOptions {}
/** Stable pmndrs pass with owned cleanup; ref exposes options and diagnostics. */
export const CRT: ForwardRefExoticComponent<CRTProps & RefAttributes<CRTPass>>;
