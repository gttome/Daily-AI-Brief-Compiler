import fs from 'node:fs';
import path from 'node:path';

const branch=process.argv[2] || process.env.GITHUB_REF_NAME || '';
const root=process.argv[3] || '.';
const allowVerified=process.argv.includes('--allow-verified');
const match=/^shadow\/(\d{4}-\d{2}-\d{2})$/.exec(branch);
if(!match){
  console.log('ready=false');
  process.exit(0);
}
const date=match[1];
const statePath=path.join(root,'shadow-runs',date,'compiler-state.json');
if(!fs.existsSync(statePath)){
  console.log('ready=false');
  process.exit(0);
}
const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const readyState=(state.state==='BUNDLE_READY' && state.stage==='BUNDLE') || (allowVerified && state.state==='SHADOW_VERIFIED' && state.stage==='VERIFY');
const ready=readyState &&
  state.bundle?.status==='BUNDLE_READY' &&
  typeof state.bundle?.digest==='string' &&
  /^[a-f0-9]{64}$/.test(state.bundle.digest);
console.log('ready='+(ready?'true':'false'));
if(ready){
  console.log('branch='+branch);
  console.log('date='+date);
  console.log('bundle_digest='+state.bundle.digest);
}
