import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';

const root=new URL('../packages/crt-shader/',import.meta.url);
test('one package exposes isolated engine adapters and portable shader sources',async()=>{
  assert.ok(existsSync(new URL('package.json',root)),'The publishable crt-shader package must exist');
  const pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
  assert.equal(pkg.name,'crt-shader');
  for(const name of ['.','./glsl','./presets','./react','./three','./postprocessing','./r3f']){
    assert.ok(pkg.exports[name]?.import,`Missing ${name} export`);
    assert.ok(existsSync(new URL(pkg.exports[name].import,root)));
    assert.ok(existsSync(new URL(pkg.exports[name].types,root)));
  }
  assert.equal(pkg.exports['./glsl/*'],'./glsl/*');
  const shader=await import(new URL(pkg.exports['./glsl'].import,root));
  for(const name of ['vertex','horizontal','vertical','optics'])assert.match(shader[name],/^#version 300 es/);
  assert.equal(createHash('sha256').update(readFileSync(new URL('shaders.js',root))).digest('hex'),'59ab9fc09461cd2ecde62a8d9ca57ff1d4c1acf653b325a9b31079884b411ed4','Approved shader source stays byte-identical');
  assert.equal(createHash('sha256').update(readFileSync(new URL('presets.js',root))).digest('hex'),'effe4e721774cfd5761af8862ecbd8838a9b43934f791a4f657c922f24f19736','Approved presets stay byte-identical');
});

test('copyable GLSL preserves the canonical programs and attribution',async()=>{
  const shader=await import(new URL('shaders.js',root));
  for(const name of ['vertex','horizontal','vertical','optics']){
    const file=new URL(`glsl/${name}.glsl`,root);
    assert.ok(existsSync(file),`Missing portable ${name}.glsl`);
    const text=readFileSync(file,'utf8');
    assert.match(text,/SPDX-License-Identifier: MIT/);
    assert.match(text,/Brooklyn \(OutThisLife\)/);
    assert.match(text,/https:\/\/datagubbe.se\/crt\//);
    assert.equal(text.replace(/\/\* crt-shader[\s\S]*?\*\/\n/,''),shader[name]);
  }
});

test('the package ships the canonical agent porting guide',()=>{
  const pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
  assert.ok(pkg.files.includes('PORTING.md'),'Porting guide must be in the shipping allowlist');
  assert.equal(readFileSync(new URL('PORTING.md',root),'utf8'),readFileSync(new URL('../docs/agents/PORTING.md',import.meta.url),'utf8'));
});
