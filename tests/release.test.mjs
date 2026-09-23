import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {cp,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root=fileURLToPath(new URL('../',import.meta.url));

test('publishing is main-only and isolated from verification and PR creation',async()=>{
  const workflow=await readFile(join(root,'.github/workflows/release.yml'),'utf8');
  const [beforePublish,publish]=workflow.split('\n  publish:\n');
  assert(publish,'Publishing must be a separate job');
  assert.doesNotMatch(beforePublish,/id-token:\s*write/);
  assert.match(publish,/id-token:\s*write/);
  assert.match(publish,/needs:\s*pack/);
  assert.match(publish,/environment:\s*npm/);
  assert.match(workflow,/github.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/pack-dir-artifact-id:/);
  assert.match(workflow,/gh workflow run ci.yml --ref changeset-release\/main/);
  assert.doesNotMatch(workflow,/NPM_TOKEN|NODE_AUTH_TOKEN|pull_request_target/);
  const ci=await readFile(join(root,'.github/workflows/ci.yml'),'utf8');
  assert.match(ci,/pnpm check/);
  assert.match(ci,/pnpm verify:package/);
  assert.doesNotMatch(ci,/id-token:\s*write|contents:\s*write/);
});

test('Changesets keeps docs private and versions the library with explicit release notes',async t=>{
  const config=JSON.parse(await readFile(join(root,'.changeset/config.json'),'utf8'));
  assert.equal(config.baseBranch,'main');
  assert.equal(config.access,'public');
  assert.deepEqual(config.privatePackages,{version:false,tag:false});
  for(const [bump,version] of [['patch','1.0.1'],['minor','1.1.0'],['major','2.0.0']]){
    await t.test(bump,async()=>{
      const directory=await mkdtemp(join(tmpdir(),'crt-changesets-'));
      t.after(()=>rm(directory,{recursive:true,force:true}));
      for(const file of ['package.json','pnpm-workspace.yaml','packages/crt-shader/package.json','examples/package.json','docs/package.json','.changeset/config.json']){
        await cp(join(root,file),join(directory,file),{recursive:true});
      }
      const path=join(directory,'packages/crt-shader/package.json');
      const manifest=JSON.parse(await readFile(path,'utf8'));
      manifest.version='1.0.0';
      await writeFile(path,JSON.stringify(manifest));
      const run=(command,args)=>execFileSync(command,args,{cwd:directory,encoding:'utf8',stdio:'pipe'});
      run('git',['init','--quiet']);
      run('git',['add','.']);
      run('git',['-c','user.name=Release test','-c','user.email=release@example.invalid','commit','--quiet','-m','Fixture']);
      const changeset=join(root,'node_modules/.bin/changeset');
      const unchanged=spawnSync(changeset,['version'],{cwd:directory,encoding:'utf8'});
      assert.match(unchanged.stdout,/No unreleased changesets found/);
      assert.equal(JSON.parse(await readFile(path,'utf8')).version,'1.0.0','No changeset means no release');
      await writeFile(join(directory,'.changeset/release-test.md'),`---\n"crt-shader": ${bump}\n---\n\nVerify the release pipeline.\n`);
      run(changeset,['version']);
      assert.equal(JSON.parse(await readFile(path,'utf8')).version,version);
      assert.match(await readFile(join(directory,'packages/crt-shader/CHANGELOG.md'),'utf8'),/Verify the release pipeline/);
      for(const file of ['examples/package.json','docs/package.json']){
        const before=JSON.parse(await readFile(join(root,file),'utf8'));
        const after=JSON.parse(await readFile(join(directory,file),'utf8'));
        assert.equal(after.private,true);
        assert.equal(after.version,before.version,'Private workspaces are not versioned');
      }
      await assert.rejects(readFile(join(directory,'.changeset/release-test.md')), {code:'ENOENT'});
    });
  }
});

test('package verification follows the manifest version rather than a stale archive',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'crt-release-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await cp(join(root,'scripts'),join(directory,'scripts'),{recursive:true});
  await cp(join(root,'packages/crt-shader/package.json'),join(directory,'packages/crt-shader/package.json'),{recursive:true});
  const path=join(directory,'packages/crt-shader/package.json');
  const manifest=JSON.parse(await readFile(path,'utf8'));
  manifest.version='1.2.3';
  await writeFile(path,JSON.stringify(manifest));
  const result=spawnSync(process.execPath,['scripts/verify-package.mjs'],{cwd:directory,encoding:'utf8'});
  assert.notEqual(result.status,0,'A missing release archive must fail');
  assert.match(result.stderr,/crt-shader-1\.2\.3\.tgz/,'Select the archive for the version being released');
  assert.doesNotMatch(result.stderr,/crt-shader-1\.0\.0\.tgz/);
});
