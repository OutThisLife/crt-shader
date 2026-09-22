import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import * as shaders from '../packages/crt-shader/shaders.js';

const root=new URL('../',import.meta.url);
const pkg=new URL('packages/crt-shader/',root);
const notice=`/* crt-shader — generated from shaders.js; do not edit.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Brooklyn (OutThisLife)
 * Article inspiration: https://datagubbe.se/crt/ and https://datagubbe.se/crt2/
 * Preserve the accompanying LICENSE and NOTICE.md when copying or porting.
 */
`;
await mkdir(new URL('glsl/',pkg),{recursive:true});
for(const name of ['vertex','horizontal','vertical','optics']){
  const source=shaders[name];
  const newline=source.indexOf('\n')+1;
  await writeFile(new URL(`glsl/${name}.glsl`,pkg),source.slice(0,newline)+notice+source.slice(newline));
}
for(const name of ['LICENSE','NOTICE.md'])await copyFile(new URL(name,root),new URL(name,pkg));
await copyFile(new URL('docs/agents/PORTING.md',root),new URL('PORTING.md',pkg));
console.log('Exported canonical GLSL, attribution notices and the porting guide.');
