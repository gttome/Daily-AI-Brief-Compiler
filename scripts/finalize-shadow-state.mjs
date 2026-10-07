import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2];
const date=process.argv[3];
const pageUrl=process.argv[4];
if(!root||!date||!pageUrl) throw new Error('usage: node scripts/finalize-shadow-state.mjs <worktree> <date> <page-url>');

const run=path.join(root,'shadow-runs',date);
const statePath=path.join(run,'compiler-state.json');
const compile=JSON.parse(fs.readFileSync('build/reader-source/compile-receipt.json','utf8'));
const sourceVerify=JSON.parse(fs.readFileSync('build/reader-source/verification-receipt.json','utf8'));
const built=JSON.parse(fs.readFileSync('build/built-verification.json','utf8'));
const live=JSON.parse(fs.readFileSync('build/live-verification.json','utf8'));

if(compile.result!=='PASS'||sourceVerify.result!=='PASS'||built.result!=='PASS'||live.result!=='PASS') {
  throw new Error('cannot finalize without source, built-reader and live parity PASS');
}

const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const sealed=(state.state==='BUNDLE_READY'&&state.stage==='BUNDLE')||(state.state==='SHADOW_VERIFIED'&&state.stage==='VERIFY');
if(!sealed||state.bundle?.digest!==compile.bundle_sha256) throw new Error('state/bundle changed during compile');

fs.mkdirSync(path.join(run,'compiler'),{recursive:true});
for(const [source,name] of [
  ['build/reader-source/compile-receipt.json','compile-receipt.json'],
  ['build/reader-source/verification-receipt.json','source-verification-receipt.json'],
  ['build/built-verification.json','built-reader-verification.json'],
  ['build/live-verification.json','live-verification.json'],
  ['build/history-merge-receipt.json','history-merge-receipt.json']
]){
  if(fs.existsSync(source))fs.copyFileSync(source,path.join(run,'compiler',name));
}

state.state='SHADOW_VERIFIED';
state.stage='VERIFY';
state.updated_at=new Date().toISOString();
state.retryable=false;
state.last_error=null;
state.preview={url:pageUrl,bundle_digest:compile.bundle_sha256};
state.reader_parity={
  result:'PASS',
  contract:'reader-surface-parity-v2',
  production_reader_source_sha:compile.production_reader_source_sha,
  semantic_rework:0,
  accepted_image_regenerations:0
};

fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
