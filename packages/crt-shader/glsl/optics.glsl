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
 if(bypass>.5){vec2 p=vec2(uv.x,1.-uv.y)*viewSize+viewOrigin;frag=vec4(sampleBlack(vec2(p.x/sourceSize.x,1.-p.y/sourceSize.y)),1.);return;}
 vec2 pixel=1./viewSize;
 vec3 sharp=texture(tex,uv).rgb;
 vec2 f=focus*pixel;
 vec3 soft=sharp*.25;
 soft+=(sampleBlack(uv+vec2(f.x,0.))+sampleBlack(uv-vec2(f.x,0.))+sampleBlack(uv+vec2(0.,f.y))+sampleBlack(uv-vec2(0.,f.y)))*.125;
 soft+=(sampleBlack(uv+f)+sampleBlack(uv-f)+sampleBlack(uv+vec2(f.x,-f.y))+sampleBlack(uv+vec2(-f.x,f.y)))*.0625;
 vec2 g=pixel*1.1;
 vec3 halo=(sampleBlack(uv+vec2(g.x,0.))+sampleBlack(uv-vec2(g.x,0.))+sampleBlack(uv+vec2(0.,g.y))+sampleBlack(uv-vec2(0.,g.y)))*.25;
 if(cameraBlur>0.){
  soft=vec3(0.);float total=0.;
  vec2 tap=cameraBlur*(outputSize.x/viewSize.x)/(1.2*outputSize);
  for(int j=-3;j<=3;j++)for(int i=-3;i<=3;i++){
   float w=exp(-.5*float(i*i+j*j)/(1.2*1.2));soft+=sampleBlack(uv+vec2(float(i),float(j))*tap)*w;total+=w;
  }
  soft/=total;
 }
 vec3 c=(soft+halo*glow)*exposure*vec3(redGain,greenGain,blueGain);
 c=max(vec3(dot(c,vec3(1.,rg,rb)),dot(c,vec3(gr,1.,gb)),dot(c,vec3(br,bg,1.))),vec3(0.));
 // Gentle highlight shoulder, preserving most of the original contrast.
 c=c/(1.+max(c-vec3(.8),vec3(0.))*.35);
 frag=vec4(pow(max(c,vec3(0.)),vec3(1./(outputGamma>0.?outputGamma:gamma)))*(1.-blackLevel)+blackLevel,1.);
}