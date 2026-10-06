import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2];
const date=process.argv[3];
const pageUrl=process.argv[4];
if(!root||!date||!pageUrl) throw new Error('usage: node scripts/finalize-shadow-state.mjs <worktree> <date> <page-url>');

const run=path.join(root,'shadow-runs',date);
const statePath=path.join(run,'compiler-state.json');
const receipt=JSON.parse(fs.readFileSync('build/shadow/compile-receipt.json','utf8'));
const live=JSON.parse(fs.readFileSync('build/shadow/live-verification.json','utf8'));

if(receipt.result!=='PASS'||live.result!=='PASS') throw new Error('cannot finalize without compile and live PASS');

const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
if(state.state!=='BUNDLE_READY'||state.bundle?.digest!==receipt.bundle_sha256){
  throw new Error('state/bundle changed during compile');
}

fs.mkdirSync(path.join(run,'compiler'),{recursive:true});
fs.copyFileSync('build/shadow/compile-receipt.json',path.join(run,'compiler','compile-receipt.json'));
fs.copyFileSync('build/shadow/verification-receipt.json',path.join(run,'compiler','verification-receipt.json'));
fs.copyFileSync('build/shadow/live-verification.json',path.join(run,'compiler','live-verification.json'));

state.state='SHADOW_VERIFIED';
state.stage='VERIFY';
state.updated_at=new Date().toISOString();
state.retryable=false;
state.last_error=null;
state.preview={url:pageUrl,bundle_digest:receipt.bundle_sha256};

fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
