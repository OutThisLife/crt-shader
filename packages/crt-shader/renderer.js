import {vertex,horizontal,vertical,optics} from './shaders.js';
import {PRESETS} from './presets.js';
import {ByteCache} from './cache.js';

// One GPU context for the entire gallery; each finished frame is copied to 2D.
export class CRTRenderer {
  constructor({cacheBytes=32*1024**2,targetBytes=32*1024**2,sourceBytes=16*1024**2}={}){
    this.canvas=document.createElement('canvas');
    const gl=this.gl=this.canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
    if(!gl)throw new Error('WebGL 2 is unavailable.');
    this.floatTargets=!!gl.getExtension('EXT_color_buffer_float');
    this.programs=[horizontal,vertical,optics].map(text=>{
      const program=gl.createProgram();
      for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,text]]){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
        gl.attachShader(program,shader);gl.deleteShader(shader);
      }
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      const uniforms=Object.fromEntries(['tex','sourceSize','outputSize','viewOrigin','viewSize','bypass',...Object.keys(PRESETS.reference)].map(key=>[key,gl.getUniformLocation(program,key)]));
      return {program,uniforms,position:gl.getAttribLocation(program,'a_position')};
    });
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.ids=new WeakMap();this.nextId=0;this.disposed=false;
    this.outputs=new ByteCache(cacheBytes,({canvas})=>{canvas.width=canvas.height=1;});
    this.sources=new ByteCache(sourceBytes,({t})=>gl.deleteTexture(t));
    this.targets=new ByteCache(targetBytes,({t,f})=>{gl.deleteTexture(t);gl.deleteFramebuffer(f);});
    this.counters={renders:0,cacheHits:0,drawCalls:0,sourceUploads:0,targetAllocations:0};
  }
  texture(){
    const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;
  }
  target(width,height,linear=false){
    const gl=this.gl,t=this.texture();
    gl.texImage2D(gl.TEXTURE_2D,0,this.floatTargets?gl.RGBA16F:gl.RGBA8,width,height,0,gl.RGBA,this.floatTargets?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
    if(linear){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);}
    const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Cannot allocate the CRT framebuffer.');
    this.counters.targetAllocations++;return {t,f,width,height};
  }
  get stats(){return {...this.counters,cacheBytes:this.outputs.bytes,targetBytes:this.targets.bytes,sourceBytes:this.sources.bytes};}
  sourceId(source){if(!this.ids.has(source))this.ids.set(source,++this.nextId);return this.ids.get(source);}
  invalidate(source){
    const id=this.ids.get(source);if(id===undefined)return;
    this.sources.delete(id);
    for(const [key,{value}]of this.outputs.items)if(value.sourceId===id)this.outputs.delete(key);
  }
  copy(source,output,width,height){
    if(output.width!==width)output.width=width;if(output.height!==height)output.height=height;
    output.getContext('2d').drawImage(source,0,0);
  }
  render(source,output,state,{view=null,width=output.width,height=output.height,sourceVersion}={}){
    if(this.disposed)throw new Error('CRT renderer has been disposed.');
    const gl=this.gl;
    const sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||!sw||!sh)throw new RangeError('CRT dimensions must be positive integers.');
    const origin=view?.origin||[0,0],size=view?.size||[sw,sh],id=this.sourceId(source);
    // Unversioned inputs retain the original always-refresh behavior for mutable canvases.
    const key=sourceVersion===undefined?null:JSON.stringify([id,sourceVersion,sw,sh,width,height,origin,size,...Object.keys(PRESETS.reference).map(k=>state[k])]);
    const cached=key===null?null:this.outputs.get(key);
    if(cached){this.copy(cached.canvas,output,width,height);this.counters.cacheHits++;return;}
    if(this.canvas.width!==width)this.canvas.width=width;if(this.canvas.height!==height)this.canvas.height=height;
    const targetKeys=[`${width}:${sh}:nearest`,`${width}:${height}:linear`];
    const targets=[this.targets.take(targetKeys[0])||this.target(width,sh),this.targets.take(targetKeys[1])||this.target(width,height,true)];
    let input=this.sources.get(id);const fresh=!input;
    if(!input)input={t:this.texture()};
    if(fresh||sourceVersion===undefined||input.version!==sourceVersion||input.width!==sw||input.height!==sh){
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input.t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}catch(error){if(fresh)gl.deleteTexture(input.t);for(let i=0;i<targets.length;i++)if(!this.targets.items.has(targetKeys[i])){gl.deleteTexture(targets[i].t);gl.deleteFramebuffer(targets[i].f);}throw error;}
      finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}
      Object.assign(input,{version:sourceVersion,width:sw,height:sh});this.counters.sourceUploads++;
    }
    const pass=(item,texture,framebuffer,w,h)=>{
      const {program,uniforms,position}=item;gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.viewport(0,0,w,h);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform1i(uniforms.tex,0);gl.uniform2f(uniforms.sourceSize,sw,sh);gl.uniform2f(uniforms.outputSize,width,height);
      gl.uniform2f(uniforms.viewOrigin,...origin);gl.uniform2f(uniforms.viewSize,...size);gl.uniform1f(uniforms.bypass,0);
      for(const [key,value] of Object.entries(state))gl.uniform1f(uniforms[key],value);
      gl.drawArrays(gl.TRIANGLES,0,6);this.counters.drawCalls++;
    };
    pass(this.programs[0],input.t,targets[0].f,width,sh);
    pass(this.programs[1],targets[0].t,targets[1].f,width,height);
    pass(this.programs[2],targets[1].t,null,width,height);
    this.copy(this.canvas,output,width,height);this.counters.renders++;
    if(!this.sources.set(id,input,sw*sh*4))gl.deleteTexture(input.t);
    for(let i=0;i<targets.length;i++)if(!this.targets.set(targetKeys[i],targets[i],targets[i].width*targets[i].height*(this.floatTargets?8:4))){gl.deleteTexture(targets[i].t);gl.deleteFramebuffer(targets[i].f);}
    if(key!==null&&width*height*4<=this.outputs.limit&&this.outputs.limit>0){
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(output,0,0);
      this.outputs.set(key,{canvas,sourceId:id},width*height*4);
    }
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.outputs.clear();this.sources.clear();this.targets.clear();
    for(const {program}of this.programs)this.gl.deleteProgram(program);
    this.gl.deleteBuffer(this.buffer);this.canvas.width=this.canvas.height=1;
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
