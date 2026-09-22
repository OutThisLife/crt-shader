import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
const archive=resolve(root,args.find(arg=>!arg.startsWith('--'))||'artifacts/crt-shader-1.0.0.tgz');
const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');
assert(entries.every(name=>!/(?:^|\/)(?:tests|examples|assets|calibration|node_modules|\.env)(?:\/|$)/.test(name)),'Tarball contains non-library material');
for(const name of ['LICENSE','NOTICE.md','README.md','PORTING.md','glsl/vertex.glsl','glsl/horizontal.glsl','glsl/vertical.glsl','glsl/optics.glsl'])assert(entries.includes(`package/${name}`),`Missing ${name}`);
const consumer=await mkdtemp(join(tmpdir(),'crt-shader-consumer-'));
await writeFile(join(consumer,'package.json'),JSON.stringify({name:'crt-shader-consumer',private:true,type:'module'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund',archive],{cwd:consumer,stdio:'pipe'});
const code=`
import assert from 'node:assert/strict';
import {createRuntime,PRESETS} from 'crt-shader';
import {vertex,horizontal,vertical,optics} from 'crt-shader/glsl';
import {PRESETS as presets} from 'crt-shader/presets';
assert.equal(PRESETS,presets);assert.equal(typeof document,'undefined');
assert(Object.isFrozen(PRESETS.reference));
for(const shader of [vertex,horizontal,vertical,optics])assert(shader.startsWith('#version 300 es'));
const runtime=createRuntime();assert.equal(runtime.stats.contexts,0);runtime.dispose();
for(const peer of ['react','three','postprocessing','@react-three/fiber']){
 let installed=false;try{import.meta.resolve(peer);installed=true;}catch{}
 assert(!installed,'Core-only consumers must not install '+peer);
}
console.log('Clean installed consumer: core/GLSL/presets imports and no engine peers.');
`;
await writeFile(join(consumer,'verify.mjs'),code);
execFileSync(process.execPath,['verify.mjs'],{cwd:consumer,stdio:'inherit'});
const meta=JSON.parse(await readFile(join(consumer,'node_modules/crt-shader/package.json'),'utf8'));
assert.equal(meta.name,'crt-shader');assert.equal(meta.license,'MIT');
if(args.includes('--browser')){
  const example=JSON.parse(await readFile(join(root,'examples/package.json'),'utf8'));
  const workspace=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  const dependencies=Object.entries(example.dependencies).filter(([name])=>name!=='crt-shader');
  for(const name of ['@types/react','@types/react-dom','@types/three'])dependencies.push([name,workspace.devDependencies[name]]);
  execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund',...dependencies.map(([name,version])=>`${name}@${version}`)],{cwd:consumer,stdio:'pipe'});
  execFileSync(process.execPath,['--test',join(root,'tests/types.test.mjs'),join(root,'examples/tests/browser.test.mjs')],{cwd:consumer,env:{...process.env,CRT_TEST_PACKAGE_ROOT:consumer},stdio:'inherit'});
}
console.log(JSON.stringify({archive,consumer,files:entries.length,version:meta.version}));
