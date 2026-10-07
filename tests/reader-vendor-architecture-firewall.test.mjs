import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const vendor=path.join(root,'vendor','production-reader');
const allow=JSON.parse(fs.readFileSync(path.join(vendor,'ALLOWLIST.json'),'utf8'));
const deny=JSON.parse(fs.readFileSync(path.join(vendor,'DENYLIST.json'),'utf8'));
const provenance=JSON.parse(fs.readFileSync(path.join(vendor,'PROVENANCE.json'),'utf8'));

function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?walk(p):[p];
  });
}
function globMatch(pattern,value){
  const token='__GLOBSTAR__';
  const escaped=pattern
    .replaceAll('**',token)
    .replace(/[.+^$(){}|[\]\\]/g,'\\$&')
    .replace(/\*/g,'[^/]*')
    .replaceAll(token,'.*');
  return new RegExp('^'+escaped+'$').test(value);
}
const allowed=[...allow.classes.READER_PURE,...allow.classes.READER_DATA,...allow.classes.READER_BROWSER];
const sourceMapPath=path.join(vendor,'SOURCE-MAP.json');

test('reader vendor provenance is pinned and runtime-independent',()=>{
  assert.equal(provenance.source_repository,'gttome/Daily-AI-Brief');
  assert.equal(provenance.source_sha,'912248e5add14b2ec08d7a5eefed43cbf3af485f');
  assert.equal(provenance.runtime_dependency_on_source_repo,false);
  assert.equal(provenance.production_repo_write_access_required,false);
});

test('reader vendor architecture firewall rejects control-plane and editorial-research dependencies',()=>{
  const sourceMap=fs.existsSync(sourceMapPath)?JSON.parse(fs.readFileSync(sourceMapPath,'utf8')):{};
  for(const [vendored,source] of Object.entries(sourceMap)){
    assert.ok(allowed.some(p=>globMatch(p,source)),`non-allowlisted source: ${source}`);
    assert.ok(!deny.prohibited_path_fragments.some(p=>source.includes(p)),`prohibited source path: ${source}`);
    assert.ok(!Object.entries(deny.explicit_classification).some(([p,c])=>['CONTROL_PLANE','EDITORIAL_RESEARCH','UNKNOWN'].includes(c)&&globMatch(p,source)),`prohibited classification: ${source}`);
    const file=path.join(vendor,vendored);
    if(!fs.existsSync(file)||!/\.(?:mjs|js|html|md|yml|yaml|json|css|xml)$/.test(file))continue;
    const text=fs.readFileSync(file,'utf8');
    for(const needle of deny.prohibited_imports) assert.ok(!text.includes(needle),`prohibited import/source string ${needle} in ${vendored}`);
    for(const needle of deny.prohibited_source_patterns) assert.ok(!text.includes(needle),`prohibited runtime/source string ${needle} in ${vendored}`);
  }
  for(const file of walk(path.join(vendor,'runtime'))){
    const rel=path.relative(vendor,file).replaceAll(path.sep,'/');
    assert.ok(!deny.prohibited_path_fragments.some(p=>rel.includes(p)),`prohibited vendored path: ${rel}`);
  }
});
