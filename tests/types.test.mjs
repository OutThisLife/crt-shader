import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';

// Compile a real consumer of each subpath, not just the declarations in isolation.
test('all public JavaScript APIs have usable TypeScript declarations',()=>{
  const root=process.env.CRT_TEST_PACKAGE_ROOT?`${process.env.CRT_TEST_PACKAGE_ROOT}/`:fileURLToPath(new URL('../',import.meta.url));
  const filename=`${root}tests/consumer.mts`;
  const source=`
    import {createElement,createRef} from 'react';
    import {createRuntime,CRTRenderer,PRESETS,prepareInput,resolveSettings,type CRTSettings} from 'crt-shader';
    import {horizontal,vertical,optics,vertex} from 'crt-shader/glsl';
    import {PRESETS as presets} from 'crt-shader/presets';
    import {CRTImage,type CRTImageProps} from 'crt-shader/react';
    import {CRTPass as ThreePass} from 'crt-shader/three';
    import {CRTPass as PmndrsPass} from 'crt-shader/postprocessing';
    import {CRT} from 'crt-shader/r3f';
    const program:string=vertex+horizontal+vertical+optics;
    const settings:CRTSettings=resolveSettings('reference',presets.clean);
    const props:CRTImageProps={src:'/sample.png',alt:'Sample',inputMode:'photo',inputResolution:96,beam:0.5,sourceVersion:1,onError:error=>console.log(error.message)};
    createElement(CRTImage,props);
    createElement(CRT,{preset:'reference',inputResolution:'auto',ref:createRef<PmndrsPass>()});
    const a=new ThreePass({preset:'reference'}),b=new PmndrsPass({inputResolution:128});
    a.setOptions({beam:undefined}).setSize(640,480);b.setOptions({mode:'original'});
    a.dispose();b.dispose();
    // @ts-expect-error preset values are immutable
    PRESETS.reference.beam=0;
    // @ts-expect-error settings take numbers, not strings
    createElement(CRTImage,{src:'/x.png',beam:'wide'});
    // @ts-expect-error unsupported renderer modes must fail at compile time
    new ThreePass({mode:'wrong'});
  `;
  const options={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts']};
  const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
  host.getSourceFile=(name,version,...args)=>name===filename?ts.createSourceFile(name,source,version,true):original(name,version,...args);
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([filename],options,host));
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:name=>name,getNewLine:()=> '\n'}));
});
