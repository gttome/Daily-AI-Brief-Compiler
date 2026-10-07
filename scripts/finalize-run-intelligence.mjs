#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {readRunEvents} from '../observability/events.mjs';
import {aggregateRunMetrics,buildRunAnalysis} from '../observability/run-analysis.mjs';
import {buildDashboardSnapshot} from '../dashboard/snapshot.mjs';

const runRoot=process.argv[2];
if(!runRoot) throw new Error('usage: node scripts/finalize-run-intelligence.mjs <run-root>');
const eventPath=path.join(runRoot,'observability/events.jsonl');
const problemDir=path.join(runRoot,'observability/problems');
const resourceDir=path.join(runRoot,'observability/resources');
const outDir=path.join(runRoot,'observability');

const readJsonDir=dir=>{
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort().map(x=>JSON.parse(fs.readFileSync(path.join(dir,x),'utf8')));
};

const events=readRunEvents(eventPath);
const problems=readJsonDir(problemDir);
const resourceObservations=readJsonDir(resourceDir);
const metrics=aggregateRunMetrics({events,problems,resourceObservations});
const analysis=buildRunAnalysis({metrics,problems,resourceObservations});
const dashboard=buildDashboardSnapshot({
  system:{status:analysis.result==='FAIL'?'degraded':'healthy',source:'finalize-run-intelligence'},
  currentRun:{edition_date:metrics.edition_date,execution_id:metrics.execution_id,result:analysis.result},
  recentRuns:[{edition_date:metrics.edition_date,execution_id:metrics.execution_id,wall_seconds:metrics.wall_seconds}],
  resourceHealth:resourceObservations,
  futureBriefQueue:[],
  corrections:[],
  usage:metrics.usage,
  risks:problems.filter(x=>x.status==='open'||x.status==='external_blocker').map(x=>({problem_id:x.problem_id,problem:x.problem,status:x.status})),
  nextActions:analysis.improvements.filter(x=>x.priority==='P0'||x.priority==='P1')
});

fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'run-metrics.json'),JSON.stringify(metrics,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'run-analysis.json'),JSON.stringify(analysis,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'dashboard-snapshot.json'),JSON.stringify(dashboard,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',events:events.length,problems:problems.length,resource_observations:resourceObservations.length,metrics:path.join(outDir,'run-metrics.json'),analysis:path.join(outDir,'run-analysis.json'),dashboard:path.join(outDir,'dashboard-snapshot.json')},null,2));
