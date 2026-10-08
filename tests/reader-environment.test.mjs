import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readerEnvironment,readerDestination,resolveReaderEnvironment,normalizeReaderEnvironment} from '../compiler/reader-environment.mjs';
import {compileShadow,buildSite} from '../compiler/compile.mjs';
import {rewriteReaderEnvironmentText} from '../compiler/reader-materializer.mjs';

test('I07-T06 reader environment preserves the current default destination and authority',()=>{
  assert.deepEqual(resolveReaderEnvironment(),readerEnvironment);
  assert.deepEqual(resolveReaderEnvironment({}),readerEnvironment);
  assert.ok(Object.isFrozen(resolveReaderEnvironment()));
  assert.deepEqual(readerDestination(readerEnvironment),{
    publicBase:'https://gttome.github.io/Daily-AI-Brief-Compiler',
    baseurl:'/Daily-AI-Brief-Compiler',origin:'https://gttome.github.io'
  });
});

test('I07-T06 reader environment accepts canonical isolated origin and nested or root basepath',()=>{
  for(const baseurl of ['/qualification/value-candidate','']){
    const supplied={publicBase:'https://compiler-preview.example.test'+baseurl,baseurl};
    const environment=resolveReaderEnvironment(supplied);
    assert.deepEqual(readerDestination(environment),{...supplied,origin:'https://compiler-preview.example.test'});
    for(const key of Object.keys(readerEnvironment).filter(key=>!['publicBase','baseurl'].includes(key)))
      assert.equal(environment[key],readerEnvironment[key]);
    assert.equal(normalizeReaderEnvironment(supplied.publicBase+'/briefs/2026-10-06/',environment),
      readerEnvironment.productionReferenceBase+'/briefs/2026-10-06/');
  }
});

test('I07-T06 reader environment rejects ambiguous or unsafe destination bindings',()=>{
  const bad=[
    {publicBase:'http://compiler-preview.example.test/proof',baseurl:'/proof'},
    {publicBase:'https://owner:secret@compiler-preview.example.test/proof',baseurl:'/proof'},
    {publicBase:'https://compiler-preview.example.test/proof?token=private',baseurl:'/proof'},
    {publicBase:'https://compiler-preview.example.test/proof#fragment',baseurl:'/proof'},
    {publicBase:'https://compiler-preview.example.test/proof',baseurl:'/different'},
    {publicBase:'https://compiler-preview.example.test/proof/',baseurl:'/proof/'},
    {publicBase:'https://compiler-preview.example.test/one/../proof',baseurl:'/one/../proof'},
    {publicBase:'https://compiler-preview.example.test/%2e%2e/proof',baseurl:'/%2e%2e/proof'},
    {publicBase:'https://compiler-preview.example.test//proof',baseurl:'//proof'},
    {publicBase:'https://compiler-preview.example.test/proof\n',baseurl:'/proof'},
    {publicBase:"https://compiler'preview.example.test/proof",baseurl:'/proof'},
    {publicBase:'https://compiler"preview.example.test/proof',baseurl:'/proof'},
    {publicBase:'https://compiler`preview.example.test/proof',baseurl:'/proof'},
    {publicBase:'https://compiler-preview.example.test/proof',baseurl:'/proof"\nrepository: other'},
    {publicBase:'https://localhost/proof',baseurl:'/proof'},
    {publicBase:'https://127.0.0.1/proof',baseurl:'/proof'},
    {publicBase:'https://[::1]/proof',baseurl:'/proof'},
    {publicBase:'https://gttome.github.io/Daily-AI-Brief',baseurl:'/Daily-AI-Brief'},
    {publicBase:'https://gttome.github.io/Daily-AI-Brief/preview',baseurl:'/Daily-AI-Brief/preview'}
  ];
  for(const supplied of bad)assert.throws(()=>resolveReaderEnvironment(supplied),/reader destination/,JSON.stringify(supplied));
});

test('I07-T06 reader environment cannot redirect repository, feedback or reference authority',()=>{
  for(const value of [null,[],42])assert.throws(()=>resolveReaderEnvironment(value),/must be an object/);
  assert.throws(()=>resolveReaderEnvironment({publicBase:'https://compiler-preview.example.test'}),/supplied together/);
  assert.throws(()=>resolveReaderEnvironment({baseurl:'/preview'}),/supplied together/);
  assert.throws(()=>resolveReaderEnvironment({approved:true}),/unknown reader environment field/);
  for(const key of Object.keys(readerEnvironment).filter(key=>!['publicBase','baseurl'].includes(key)))
    assert.throws(()=>resolveReaderEnvironment({[key]:'changed'}),/authority field cannot change/);
});

test('I07-T06 isolated rewrite preserves executable pinned URL regexes and Compiler repository identity',()=>{
  // The three contexts below reproduce the pinned constants, audience path
  // regex, and reading-support related-item URL regex. Parse and execute only
  // these synthetic predicates, without running browser code or HTTP.
  const source=String.raw`const base='https://gttome.github.io/Daily-AI-Brief';
const repository='gttome/Daily-AI-Brief';
const pathOkay=value=>/^\/Daily-AI-Brief\/[a-zA-Z0-9_/-]*(?:\.html)?$/.test(value);
const relatedOkay=value=>/^https:\/\/gttome.github.io\/Daily-AI-Brief\/(stories|videos|podcasts)\//.test(value);`;
  for(const baseurl of ['/qualification/value-candidate','']){
    const environment={publicBase:'https://compiler-preview.example.test'+baseurl,baseurl};
    const rewritten=rewriteReaderEnvironmentText(source,environment);
    const predicates=new Function(rewritten+'\nreturn {base,repository,pathOkay,relatedOkay};')();
    assert.equal(predicates.base,environment.publicBase);
    assert.equal(predicates.repository,readerEnvironment.repository);
    assert.equal(predicates.pathOkay(baseurl+'/stories/2026-10-06/test/'),true);
    assert.equal(predicates.relatedOkay(environment.publicBase+'/stories/2026-10-06/test/'),true);
    assert.equal(predicates.relatedOkay('https://compiler-previewXexampleXtest'+baseurl+'/stories/2026-10-06/test/'),false);
    assert.equal(predicates.relatedOkay(readerEnvironment.publicBase+'/stories/2026-10-06/test/'),false);
  }
  const defaultExpected=source.replaceAll('https://gttome.github.io/Daily-AI-Brief','__BASE__')
    .replaceAll('/Daily-AI-Brief','/Daily-AI-Brief-Compiler').replaceAll('__BASE__',readerEnvironment.publicBase);
  assert.equal(rewriteReaderEnvironmentText(source),defaultExpected);
});

test('I07-T06 invalid environment fails before compile or materializer touches output',async t=>{
  const outDir=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-invalid-reader-environment-'));
  t.after(()=>fs.rmSync(outDir,{recursive:true,force:true}));
  const marker=path.join(outDir,'preserve.txt');fs.writeFileSync(marker,'unchanged');
  const environment={publicBase:'http://compiler-preview.example.test/proof',baseurl:'/proof'};
  await assert.rejects(compileShadow({statePath:'missing-state',bundlePath:'missing-bundle',outDir,environment}),/invalid reader destination/);
  await assert.rejects(buildSite({validation:{bundle:{},bundleDigest:'a'.repeat(64)},outDir,environment}),/invalid reader destination/);
  assert.equal(fs.readFileSync(marker,'utf8'),'unchanged');
});

test('I07-T06 compiler CLI reads explicit environment JSON and rejects invalid or absent values',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-reader-environment-cli-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const environmentPath=path.join(root,'environment.json');
  fs.writeFileSync(environmentPath,JSON.stringify({publicBase:'http://compiler-preview.example.test/proof',baseurl:'/proof'}));
  const args=['compiler/compile.mjs','--state','missing-state','--bundle','missing-bundle','--out',path.join(root,'out'),'--reader-environment'];
  const invalid=spawnSync(process.execPath,[...args,environmentPath],{encoding:'utf8'});
  assert.equal(invalid.status,1);assert.match(invalid.stderr,/invalid reader destination/);
  const missing=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(missing.status,1);assert.match(missing.stderr,/reader environment JSON file required/);
  assert.equal(fs.existsSync(path.join(root,'out')),false);
});
