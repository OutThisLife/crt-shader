export const controlGroups = [
 ['Signal',[['spread','Horizontal spread',.15,1.6,.01,.64],['bleed','Extra color spread',0,2,.01,.48],['gamma','Blend gamma',1,2.6,.05,2.2]]],
 ['Electron beam',[['beam','Beam width',.1,.65,.01,.24],['bloom','Bright-area expansion',0,.35,.01,.16],['glow','Light diffusion',0,.4,.01,.10]]],
 ['Photograph / surface',[['focus','Photo softness',0,.4,.01,.08],['mask','Phosphor texture',0,.65,.01,.10],['exposure','Exposure',.6,1.8,.01,1.12]]],
 ['Geometry',[['aspect','Pixel height / width',.75,1.5,.01,1.12]]],
 ['Reference / optics',[['outputGamma','Output gamma · 0 = linked',0,3.4,.01,0],['cameraBlur','Camera blur',0,.2,.001,0],['blackLevel','Black level',0,.08,.001,0],['redGain','Red response',.4,2.5,.01,1],['greenGain','Green response',.4,2.5,.01,1],['blueGain','Blue response',.4,2.5,.01,1]]],
 ['Reference / phosphors',[['maskPitch','Triad pitch · 0 = legacy',0,1,.001,0],['maskPhase','RGB phase',-3,3,.01,0],['slot','Phosphor gaps',0,.98,.01,0],['slotPhase','Gap phase',-3,3,.01,0],['maskSlant','Mask tilt',-.1,.1,.001,0],['beamTilt','Beam tilt',-.08,.08,.001,0],['maskWarp','Mask perspective',-2,2,.01,0]]],
 ['Reference / color calibration',[['rg','Green → red',-.4,.4,.01,0],['rb','Blue → red',-.4,.4,.01,0],['gr','Red → green',-.4,.4,.01,0],['gb','Blue → green',-.4,.4,.01,0],['br','Red → blue',-.4,.4,.01,0],['bg','Green → blue',-.4,.4,.01,0]]]
];
const settings=controlGroups;
const defaults = Object.fromEntries(settings.flatMap(([,rows])=>rows.map(r=>[r[0],r[5]])));
const legacy = {soft:{...defaults},rgb:{...defaults,spread:.30,bleed:0,beam:.23,bloom:.08,focus:0,glow:.035,mask:.14,exposure:1.03,aspect:1},photo:{...defaults,spread:.82,bleed:.80,beam:.25,bloom:.20,focus:.19,glow:.15,mask:.18,exposure:1.16,aspect:1.16}};
legacy.match={...defaults,spread:.5578709613,bleed:.5636315407,gamma:1.0705261569,outputGamma:.8485562699,beam:.1840719213,bloom:.1548009529,glow:0,focus:0,mask:.1017257735,exposure:1,aspect:19.1960812271/22.3078397702,cameraBlur:.8978557591/22.3078397702,blackLevel:0,redGain:1.0718383876,greenGain:.9021840644,blueGain:.8515301518,maskPitch:9.3194278699/22.3078397702,maskPhase:.1732497797,maskSlant:.0060042998,beamTilt:.0069226077,slot:.0976022686,slotPhase:-.0199341169,rg:-.0680113591,rb:-.1368904736,gr:-.0344967575,gb:.1917875629,br:-.0753665589,bg:.4,maskWarp:.1809592285};
legacy.crisp={...legacy.match,cameraBlur:.018,spread:.53};

export const PRESETS = Object.freeze({soft:Object.freeze(legacy.soft),clean:Object.freeze(legacy.rgb),photoSoft:Object.freeze(legacy.photo),reference:Object.freeze(legacy.crisp)});
export const REGISTRATION = Object.freeze({sx:22.307839770188362,sy:19.196081227077265,tx:2.7124585748610417,ty:-10.676694881034846});
