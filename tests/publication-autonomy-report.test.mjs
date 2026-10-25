import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compileDailyReports,renderMarkdown} from '../scripts/compile-daily-aar.mjs';
const date='2026-10-25',cycle='2026-10-24';
function publicEvidence(){
 return {
  'compiler-state':{edition_date:date,execution_id:'edition-test',state:'SHADOW_VERIFIED',
    reader_parity:{result:'PASS'},started_at:'2026-10-25T00:21:00Z',updated_at:'2026-10-25T01:35:00Z'},
  'compile-receipt':{edition_date:date,result:'PASS',owner_intervention:false},
  'producer-receipt':{edition_date:date,scheduled_execution:true,first_party_scheduler_attested:false,owner_intervention:false,result:'PASS'},
  'postpublish-integrity':{edition_date:date,result:'PASS',mode:'postdeploy',oct8_protected_count:17,
    live_http_and_sha256:[{url:'https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/'+date+'/',status:200,sha256:'a'.repeat(64)}]}
 };
}
test('actual owner intervention from incident evidence overrides false compiler owner_intervention=false',()=>{
 const e=publicEvidence();
 e['owner-intervention-incident']={edition_date:date,
   unattended_autonomy_result:'FAIL_OWNER_TRIGGER_REQUIRED',
   owner_intervention:{required_in_observed_sequence:true}};
 e['publication-health']={edition_date:date,status:'READER_VERIFIED',events:[
   {status:'BLOCKED_PUBLICATION',stage:'VIDEO_PLAYBACK',run_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/1234'}],
   last_recorded_blocker:{stage:'VIDEO_PLAYBACK',run_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/1234'}};
 const x=compileDailyReports({cycleDate:cycle,evidence:e});
 assert.equal(x.compiler.publication,'VERIFIED');
 assert.equal(x.compiler.result,'SUCCESS');
 assert.equal(x.compiler.autonomy_status,'FAIL_OWNER_RECOVERY');
 assert.equal(x.compiler.owner_intervention_required,true);
 assert.equal(x.compiler.prior_failed_protected_gate_count,1);
 assert.equal(x['daily-rollup'].compiler.autonomy_status,'FAIL_OWNER_RECOVERY');
 assert.match(renderMarkdown(x.compiler),/FAIL_OWNER_RECOVERY/);
});
test('verified public page without independent scheduling or owner evidence never claims unattended success',()=>{
 const e=publicEvidence();
 delete e['owner-intervention-incident'];
 const x=compileDailyReports({cycleDate:cycle,evidence:e});
 assert.equal(x.compiler.publication,'VERIFIED');
 assert.equal(x.compiler.autonomy_status,'UNPROVEN');
 assert.equal(x.compiler.owner_intervention_required,null);
});
test('unified AAR also labels owner-assisted release separately from public image status',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'autonomy-aar-'));
 try{
  const input=path.join(dir,'in'),output=path.join(dir,'out');
  fs.mkdirSync(input);
  const e=publicEvidence();
  e['owner-intervention-incident']={edition_date:date,
   unattended_autonomy_result:'FAIL_OWNER_TRIGGER_REQUIRED',
   owner_intervention:{required_in_observed_sequence:true}};
  for(const [k,v] of Object.entries(e))fs.writeFileSync(path.join(input,k+'.json'),JSON.stringify(v));
  execFileSync(process.execPath,['scripts/render-unified-production-aar.mjs',cycle,input,output],{encoding:'utf8'});
  const j=JSON.parse(fs.readFileSync(path.join(output,'combined.json'),'utf8'));
  const md=fs.readFileSync(path.join(output,'combined.md'),'utf8');
  assert.equal(j.autonomy_status,'FAIL_OWNER_RECOVERY');
  assert.equal(j.confirmed_owner_intervention,true);
  assert.match(md,/Unattended autonomy/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
