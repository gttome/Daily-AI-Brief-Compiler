import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rewriteReaderEnvironment} from '../compiler/reader-materializer.mjs';
import {readerEnvironment} from '../compiler/reader-environment.mjs';

test('environment rewriting preserves the Compiler viewer matcher and existing URLs',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'reader-prefix-'));
  try {
    fs.writeFileSync(path.join(root,'_config.yml'),'title: Test\n');
    const viewer=String.raw`/^\/Daily-AI-Brief-Compiler\/briefs\/images\//`;
    const links=[
      'https://gttome.github.io/Daily-AI-Brief/briefs/',
      'https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/',
      '/Daily-AI-Brief/assets/a.js',
      '/Daily-AI-Brief-Compiler/assets/a.js'
    ];
    const file=path.join(root,'fixture.js');
    fs.writeFileSync(file,viewer+'\n'+links.join('\n'));
    rewriteReaderEnvironment(root,readerEnvironment);
    const output=fs.readFileSync(file,'utf8').split('\n');
    assert.equal(output[0],viewer);
    assert.deepEqual(output.slice(1),[
      'https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/',
      'https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/',
      '/Daily-AI-Brief-Compiler/assets/a.js',
      '/Daily-AI-Brief-Compiler/assets/a.js'
    ]);
    const match=new RegExp(output[0].slice(1,-1));
    assert.ok(match.test('/Daily-AI-Brief-Compiler/briefs/images/2026-10-17/test.png'));
    assert.equal(match.test('/Daily-AI-Brief-Compiler-Compiler/briefs/images/test.png'),false);
    rewriteReaderEnvironment(root,readerEnvironment);
    assert.equal(fs.readFileSync(file,'utf8'),output.join('\n'));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
