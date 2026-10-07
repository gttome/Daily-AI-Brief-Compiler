import fs from 'node:fs';
import path from 'node:path';
import {readRunEvents} from '../observability/events.mjs';
import {aggregateRunMetrics,buildRunAnalysis} from '../observability/run-analysis.mjs';
import {buildDashboardSnapshot} from '../dashboard/snapshot.mjs';

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
  accepted_image_regenerations:compile.verification?.accepted_image_regenerations ?? 0
};


const obsDir=path.join(run,'observability');
const eventsPath=path.join(obsDir,'events.jsonl');
if(fs.existsSync(eventsPath)){
  const readJsonDir=dir=>{
    if(!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort().map(x=>JSON.parse(fs.readFileSync(path.join(dir,x),'utf8')));
  };
  const events=readRunEvents(eventsPath);
  if(events.length){
    const problems=readJsonDir(path.join(obsDir,'problems'));
    const resourceObservations=readJsonDir(path.join(obsDir,'resources'));
    const rateCardPath='config/usage-rate-card.json';
    const rateCard=fs.existsSync(rateCardPath)?JSON.parse(fs.readFileSync(rateCardPath,'utf8')):null;
    const metrics=aggregateRunMetrics({events,problems,resourceObservations,rateCard});
    const analysis=buildRunAnalysis({metrics,problems,resourceObservations});
    const dashboard=buildDashboardSnapshot({
      system:{status:analysis.result==='FAIL'?'degraded':'healthy',source:'shadow-finalization'},
      currentRun:{edition_date:metrics.edition_date,execution_id:metrics.execution_id,result:analysis.result},
      recentRuns:[{edition_date:metrics.edition_date,execution_id:metrics.execution_id,wall_seconds:metrics.wall_seconds}],
      resourceHealth:resourceObservations,
      futureBriefQueue:[],
      corrections:[],
      usage:metrics.usage,
      risks:problems.filter(x=>x.status==='open'||x.status==='external_blocker').map(x=>({problem_id:x.problem_id,problem:x.problem,status:x.status})),
      nextActions:analysis.improvements.filter(x=>x.priority==='P0'||x.priority==='P1')
    });
    fs.mkdirSync(obsDir,{recursive:true});
    fs.writeFileSync(path.join(obsDir,'run-metrics.json'),JSON.stringify(metrics,null,2)+'\n');
    fs.writeFileSync(path.join(obsDir,'run-analysis.json'),JSON.stringify(analysis,null,2)+'\n');
    fs.writeFileSync(path.join(obsDir,'dashboard-snapshot.json'),JSON.stringify(dashboard,null,2)+'\n');
    state.observability={
      events_path:'shadow-runs/'+date+'/observability/events.jsonl',
      metrics_path:'shadow-runs/'+date+'/observability/run-metrics.json',
      analysis_path:'shadow-runs/'+date+'/observability/run-analysis.json',
      dashboard_snapshot_path:'shadow-runs/'+date+'/observability/dashboard-snapshot.json'
    };
    state.learning={
      problems_dir:'shadow-runs/'+date+'/observability/problems',
      ledger_path:null
    };
  }
}

fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
