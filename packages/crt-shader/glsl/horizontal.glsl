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
 float x=uv.x*viewSize.x+viewOrigin.x-.5; float base=floor(x);
 vec3 color=vec3(0.);float light=0.,wl=0.,wc=0.;
 for(int i=-7;i<=7;i++){
  float at=base+float(i),d=at-x;
  vec3 s=pow(sampleBlack(vec2((at+.5)/sourceSize.x,uv.y)),vec3(gamma));
  float l=dot(s,vec3(.2126,.7152,.0722));
  float a=gaussian(d,spread), b=gaussian(d,spread+bleed);
  light+=l*a;wl+=a;color+=(s-vec3(l))*b;wc+=b;
 }
 frag=vec4(max(vec3(light/max(wl,.0001))+color/max(wc,.0001),vec3(0.)),1.);
}