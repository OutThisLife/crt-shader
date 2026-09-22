import {CRTRenderer} from './renderer.js';
import {ByteCache} from './cache.js';
import {resolveSettings} from './input.js';

const cancelled=()=>new DOMException('CRT render was cancelled.','AbortError');

export function createRuntime({frameBudget=8,imageBytes=16*1024**2,...rendererOptions}={}){
  if(!Number.isFinite(frameBudget)||frameBudget<=0)throw new RangeError('Frame budget must be positive.');
  const images=new ByteCache(imageBytes),loading=new Map(),jobs=new Map();
  let renderer=null,frame=0,disposed=false;
  const settle=(job,error)=>{
    job.signal?.removeEventListener('abort',job.abort);
    if(jobs.get(job.output)===job)jobs.delete(job.output);
    error?job.reject(error):job.resolve({width:job.width,height:job.height});
  };
  function flush(){
    frame=0;const start=performance.now();
    for(const job of jobs.values()){
      if(job.signal?.aborted){settle(job,cancelled());continue;}
      try{
        renderer??=new CRTRenderer(rendererOptions);
        renderer.render(job.source,job.output,job.state,job);settle(job);
      }catch(error){settle(job,error);}
      if(performance.now()-start>=frameBudget)break;
    }
    if(jobs.size&&!disposed)frame=requestAnimationFrame(flush);
  }
  const runtime={
    render({source,output,preset='reference',settings={},width=output.width,height=output.height,view=null,sourceVersion=0,signal}={}){
      if(disposed)return Promise.reject(new Error('CRT runtime has been disposed.'));
      if(typeof document==='undefined')return Promise.reject(new Error('CRT rendering requires a browser.'));
      if(signal?.aborted)return Promise.reject(cancelled());
      let state;try{state=resolveSettings(preset,settings);}catch(error){return Promise.reject(error);}
      const previous=jobs.get(output);if(previous)settle(previous,cancelled());
      return new Promise((resolve,reject)=>{
        const job={source,output,state,width,height,view:view?{origin:[...view.origin],size:[...view.size]}:null,sourceVersion,signal,resolve,reject};
        job.abort=()=>settle(job,cancelled());signal?.addEventListener('abort',job.abort,{once:true});jobs.set(output,job);
        if(!frame)frame=requestAnimationFrame(flush);
      });
    },
    loadImage(url,{crossOrigin='anonymous'}={}){
      if(disposed)return Promise.reject(new Error('CRT runtime has been disposed.'));
      const key=JSON.stringify([url,crossOrigin]),cached=images.get(key);if(cached)return Promise.resolve(cached);
      if(loading.has(key))return loading.get(key);
      const promise=(async()=>{
        const image=new Image();if(crossOrigin!==null)image.crossOrigin=crossOrigin;image.src=url;await image.decode();
        if(!disposed)images.set(key,image,image.naturalWidth*image.naturalHeight*4);return image;
      })();
      loading.set(key,promise);
      const forget=()=>{if(loading.get(key)===promise)loading.delete(key);};promise.then(forget,forget);return promise;
    },
    invalidate(source){renderer?.invalidate(source);},
    get stats(){return {renders:0,cacheHits:0,drawCalls:0,sourceUploads:0,targetAllocations:0,cacheBytes:0,targetBytes:0,sourceBytes:0,...renderer?.stats,queued:jobs.size,contexts:renderer&&!disposed?1:0,imageBytes:images.bytes,disposed};},
    dispose(){
      if(disposed)return;disposed=true;if(frame)cancelAnimationFrame(frame);frame=0;
      for(const job of jobs.values())settle(job,cancelled());renderer?.dispose();images.clear();loading.clear();
    }
  };
  return runtime;
}

let shared=null,references=0,releaseTimer;
export function acquireRuntime(){
  if(typeof document==='undefined')throw new Error('Acquire the CRT runtime in a client effect.');
  clearTimeout(releaseTimer);shared??=createRuntime();references++;
  let released=false;const runtime=shared;
  return {runtime,release(){
    if(released)return;released=true;references--;
    // React StrictMode can immediately reacquire during the same effect cycle.
    if(!references)releaseTimer=setTimeout(()=>{if(!references&&shared===runtime){runtime.dispose();shared=null;}},0);
  }};
}
