import {OCT9_RECOVERY_BRANCH,isAuthorizedOct9Recovery} from '../compiler/oct9-owner-exception.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const branch=process.argv[2] || process.env.GITHUB_REF_NAME || '';
const root=process.argv[3] || '.';
const allowVerified=process.argv.includes('--allow-verified');
const isOct9Recovery=branch===OCT9_RECOVERY_BRANCH;
const match=/^shadow\/(\d{4}-\d{2}-\d{2})$/.exec(branch);
if(!match && !isOct9Recovery){
  console.log('ready=false');
  process.exit(0);
}
const date=isOct9Recovery?'2026-10-09':match[1];
const statePath=path.join(root,'shadow-runs',date,'compiler-state.json');
if(!fs.existsSync(statePath)){
  console.log('ready=false');
  process.exit(0);
}
const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const readyState=(state.state==='BUNDLE_READY' && state.stage==='BUNDLE') || (allowVerified && state.state==='SHADOW_VERIFIED' && state.stage==='VERIFY');
const bundlePath=path.join(root,'shadow-runs',date,'edition-bundle.json');
const exceptionValid=!isOct9Recovery || (fs.existsSync(bundlePath) && isAuthorizedOct9Recovery({state,bundle:JSON.parse(fs.readFileSync(bundlePath,'utf8'))}));
const bundleBytes=fs.existsSync(bundlePath)?fs.readFileSync(bundlePath):null;
const bundleDigest=bundleBytes?crypto.createHash('sha256').update(bundleBytes).digest('hex'):null;
let bundleIdentityMatches=false;
if(bundleBytes){try{bundleIdentityMatches=JSON.parse(bundleBytes).edition_date===date;}catch{}}
// Once a new edition claims readiness, a malformed seal is actionable.
const stateIdentityMatches = date < '2026-11-08' || state.edition_date === date;
const ready=exceptionValid && readyState && stateIdentityMatches && bundleIdentityMatches &&
  bundleDigest===state.bundle?.digest &&
  state.bundle?.status==='BUNDLE_READY' &&
  typeof state.bundle?.digest==='string' &&
  /^[a-f0-9]{64}$/.test(state.bundle.digest);
if (!ready && date >= '2026-11-08' && state.state === 'BUNDLE_READY') {
  const reason = state.stage !== 'BUNDLE' ? 'EXPECTED_BUNDLE_STAGE' :
    state.edition_date !== date ? 'STATE_EDITION_MISMATCH' :
    !bundleBytes ? 'BUNDLE_MISSING' :
    !bundleIdentityMatches ? 'BUNDLE_INVALID_OR_WRONG_EDITION' :
    state.bundle?.status !== 'BUNDLE_READY' ? 'BUNDLE_STATUS_NOT_READY' :
    'BUNDLE_DIGEST_MISMATCH';
  console.error('SOURCE_READY_BLOCKED: ' + reason);
  process.exit(1);
}
console.log('ready='+(ready?'true':'false'));
if(ready){
  console.log('branch='+branch);
  console.log('date='+date);
  console.log('bundle_digest='+state.bundle.digest);
}
