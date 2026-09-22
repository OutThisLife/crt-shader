import {createElement, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {CRTPass} from './postprocessing.js';
import {PRESETS} from './presets.js';

const optionKeys = ['preset', 'inputResolution', 'mode', ...Object.keys(PRESETS.reference)];

/** A dedicated multipass, not a mergeable postprocessing Effect. */
export const CRT = forwardRef(function CRT(props, ref) {
  const gl = useThree(state => state.gl);
  const invalidate = useThree(state => state.invalidate);
  // Construction is CPU-only. GPU resources are allocated only after the
  // composer commits/initializes/renders the pass, not during React render.
  const owner = useMemo(() => ({pass: new CRTPass(), generation: 0}), [gl]);
  const {pass} = owner;
  useImperativeHandle(ref, () => pass, [pass]);
  useLayoutEffect(() => {
    // Include undefined entries so removing a prop restores its preset value.
    pass.setOptions(Object.fromEntries(optionKeys.map(key => [key, props[key]])));
    invalidate();
  });
  useEffect(() => {
    const generation = ++owner.generation;
    return () => {
      // StrictMode replays setup before this microtask; a genuine unmount does
      // not. The lease belongs to this pass, so renderer replacement also frees
      // the old one instead of cancelling its cleanup with the new lease.
      queueMicrotask(() => {
        if (owner.generation === generation) pass.dispose();
      });
    };
  }, [owner, pass]);
  return createElement('primitive', {object: pass, dispose: null});
});
