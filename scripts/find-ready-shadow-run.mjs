import {execFileSync} from 'node:child_process';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
let refs=[];
try{
  refs=git('for-each-ref','--format=%(refname:short)','refs/remotes/origin/shadow/').split('\n').filter(Boolean);
}catch{}

const candidates=[];
for(const ref of refs){
  const branch=ref.replace(/^origin\//,'');
  const date=branch.slice('shadow/'.length);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

  const statePath='shadow-runs/'+date+'/compiler-state.json';
  let state;
  try{
    state=JSON.parse(git('show',ref+':'+statePath));
  }catch{
    continue;
  }

  if(state.state!=='BUNDLE_READY' ||
     state.bundle?.status!=='BUNDLE_READY' ||
     !state.bundle?.digest) continue;

  const receiptPath='shadow-runs/'+date+'/compiler/compile-receipt.json';
  try{
    const receipt=JSON.parse(git('show',ref+':'+receiptPath));
    if(receipt.result==='PASS' && receipt.bundle_sha256===state.bundle.digest) continue;
  }catch{}

  candidates.push({date,branch,ref,bundle_digest:state.bundle.digest});
}

candidates.sort((a,b)=>b.date.localeCompare(a.date));
const x=candidates[0];
if(x){
  console.log('branch='+x.branch);
  console.log('ref='+x.ref);
  console.log('date='+x.date);
  console.log('bundle_digest='+x.bundle_digest);
}
