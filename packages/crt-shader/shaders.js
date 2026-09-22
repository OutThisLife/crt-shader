// Preserved verbatim from the approved Article crisp renderer.
export const vertex=`#version 300 es
in vec2 a_position; out vec2 uv;
void main(){uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;

const common=`#version 300 es
precision highp float;
in vec2 uv; out vec4 frag;
uniform sampler2D tex; uniform vec2 sourceSize; uniform vec2 outputSize; uniform vec2 viewOrigin; uniform vec2 viewSize;
uniform float spread,bleed,gamma,beam,bloom,glow,focus,mask,exposure,bypass;
uniform float outputGamma,cameraBlur,blackLevel,redGain,greenGain,blueGain,maskPitch,maskPhase,slot,slotPhase,maskSlant,beamTilt,rg,rb,gr,gb,br,bg,maskWarp;
float gaussian(float d,float s){return exp(-.5*d*d/(s*s));}
vec3 sampleBlack(vec2 p){if(any(lessThan(p,vec2(0.)))||any(greaterThanEqual(p,vec2(1.)))) return vec3(0.);return texture(tex,p).rgb;}
`;

export const horizontal=common+`
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
}`;

export const vertical=common+`
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
}`;

export const optics=common+`
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
}`;
