#version 300 es
/* crt-shader — generated from shaders.js; do not edit.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Brooklyn (OutThisLife)
 * Article inspiration: https://datagubbe.se/crt/ and https://datagubbe.se/crt2/
 * Preserve the accompanying LICENSE and NOTICE.md when copying or porting.
 */
precision highp float;
in vec2 uv; out vec4 frag;
uniform sampler2D tex; uniform vec2 sourceSize; uniform vec2 outputSize; uniform vec2 viewOrigin; uniform vec2 viewSize;
uniform float spread,bleed,gamma,beam,bloom,glow,focus,mask,exposure,bypass;
uniform float outputGamma,cameraBlur,blackLevel,redGain,greenGain,blueGain,maskPitch,maskPhase,slot,slotPhase,maskSlant,beamTilt,rg,rb,gr,gb,br,bg,maskWarp;
float gaussian(float d,float s){return exp(-.5*d*d/(s*s));}
vec3 sampleBlack(vec2 p){if(any(lessThan(p,vec2(0.)))||any(greaterThanEqual(p,vec2(1.)))) return vec3(0.);return texture(tex,p).rgb;}

void main(){
 float pixelScale=outputSize.x/viewSize.x;
 float y=(1.-uv.y)*viewSize.y+viewOrigin.y-.5-beamTilt*uv.x*outputSize.x*viewSize.y/outputSize.y,base=floor(y); vec3 c=vec3(0.);
 for(int j=-3;j<=3;j++){
  float row=base+float(j);vec3 s=sampleBlack(vec2(uv.x,1.-(row+.5)/sourceSize.y));
  // Width grows with signal intensity; integral stays constant as it widens.
  vec3 width=vec3(beam)+bloom*sqrt(max(s,vec3(0.)));
  vec3 d=vec3(y-row)/width;
  c+=s*exp(-.5*d*d)/(2.506628*width);
 }
 float cell=mod(floor(gl_FragCoord.x),3.);
 vec3 grille=cell<1.?vec3(1.,1.-mask,1.-mask):cell<2.?vec3(1.-mask,1.,1.-mask):vec3(1.-mask,1.-mask,1.);
 if(maskPitch>0.){
  float wave=(gl_FragCoord.x+maskSlant*(outputSize.y-gl_FragCoord.y))/(maskPitch*pixelScale)+maskWarp*uv.x*uv.x;
  vec3 phase=wave+maskPhase-vec3(0.,1./3.,2./3.);
  vec3 stripes=pow(.5+.5*cos(6.2831853*phase),vec3(2.));
  c*=((1.-mask)+mask*stripes)/(1.-.625*mask);
  float slots=.5+.5*cos(6.2831853*(wave+slotPhase));
  c*=((1.-slot)+slot*slots)/(1.-.5*slot);
 }else c*=grille/(1.-2.*mask/3.);
 frag=vec4(c,1.);
}