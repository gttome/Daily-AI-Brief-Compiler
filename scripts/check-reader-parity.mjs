import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {includeCoreReaderPath,prepareCoreReaderRenderer} from '../compiler/reader-core-projection.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshot=path.join(root,'vendor','production-reader','snapshot');
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');

export async function checkGoldenReaderParity({date='2026-10-06'}={}){
  const edition=JSON.parse(fs.readFileSync(path.join(snapshot,'_data','editions',date+'.json'),'utf8'));
  const actual=new Map();
  const currentPath=name=>name.startsWith('stories/'+date+'/')||name.startsWith('videos/'+date+'/')||name.startsWith('podcasts/'+date+'/');
  const stripEditorOnly=content=>String(content).replace(/<span class="story-editorial-note" data-george-implication="[^"]*" hidden><\/span>/g,'');
  // Compare the exact required reader pages against untouched baseline bytes,
  // without running the baseline's optional analytics/editorial projections.
  const productSnapshot=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-reader-parity-'));
  try{
    fs.cpSync(snapshot,productSnapshot,{recursive:true,filter:source=>includeCoreReaderPath(path.relative(snapshot,source))});
    prepareCoreReaderRenderer(productSnapshot);
    const reader=await import(pathToFileURL(path.join(productSnapshot,'_generator','lib','reader.mjs')).href);
    for(const [name,content] of reader.readerFoundationFiles(edition,productSnapshot)){
      if(currentPath(name))actual.set(name,stripEditorOnly(content));
    }
  }finally{
    fs.rmSync(productSnapshot,{recursive:true,force:true});
  }

  const compared=[],mismatches=[];
  for(const [name,content] of actual){
    const expectedPath=path.join(snapshot,name);
    if(!fs.existsSync(expectedPath))continue;
    const expected=fs.readFileSync(expectedPath,'utf8');
    const normalized=String(content).endsWith('\n')?String(content):String(content)+'\n';
    compared.push({name,sha256:sha256(Buffer.from(expected))});
    if(expected!==normalized)mismatches.push({
      name,
      expected_sha256:sha256(Buffer.from(expected)),
      actual_sha256:sha256(Buffer.from(normalized))
    });
  }

  const provenance=JSON.parse(fs.readFileSync(path.join(root,'vendor','production-reader','PROVENANCE.json'),'utf8'));
  const exactAssets=Object.entries(provenance.imported_files||{})
    .filter(([name])=>/^snapshot\/(?:_layouts|_includes|assets\/)/.test(name))
    .filter(([,row])=>row.source_sha256===row.vendored_sha256);
  const receipt={
    schema_version:'daily-compiler-reader-parity-gate-v2',
    result:mismatches.length?'FAIL':'PASS',
    fixture_date:date,
    production_reader_source_sha:provenance.source_sha,
    source_files_compared:compared.length,
    exact_reader_assets:exactAssets.length,
    approved_source_patches:provenance.patches||[],
    optional_observation_excluded:true,
    mismatches,
    allowed_environment_difference_only:true
  };
  if(compared.length<10)throw new Error('reader parity fixture coverage unexpectedly small: '+compared.length);
  if(mismatches.length)throw new Error('reader parity mismatch: '+JSON.stringify(mismatches));
  return receipt;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const receipt=await checkGoldenReaderParity();
  const out=process.argv[2];
  if(out){
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  }
  console.log(JSON.stringify(receipt,null,2));
}
