import {PRESETS} from './presets.js';
import {downsamplePhoto} from './photo-source.js';

export function resolveSettings(preset='reference',overrides={}){
  if(!Object.hasOwn(PRESETS,preset))throw new RangeError(`Unknown CRT preset: ${preset}`);
  const result={...PRESETS[preset]};
  for(const [key,value]of Object.entries(overrides)){
    if(value===undefined)continue;
    if(!Object.hasOwn(result,key)||!Number.isFinite(value))throw new TypeError(`Invalid CRT setting: ${key}`);
    result[key]=value;
  }
  return result;
}

export function prepareInput(image,{inputMode='pixel',inputResolution=96}={}){
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  if(!width||!height)throw new RangeError('Decode the image before preparing CRT input.');
  if(inputMode==='photo'){
    if(!Number.isInteger(inputResolution)||inputResolution<1)throw new RangeError('Input resolution must be a positive integer.');
    return downsamplePhoto(image,inputResolution);
  }
  if(inputMode!=='pixel')throw new RangeError(`Unknown input mode: ${inputMode}`);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');context.fillStyle='#000';context.fillRect(0,0,width,height);context.drawImage(image,0,0);
  return canvas;
}
