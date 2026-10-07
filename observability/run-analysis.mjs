const n=v=>Number.isFinite(v)?v:0;
const sum=(arr,f)=>arr.reduce((a,x)=>a+n(f(x)),0);

export function aggregateRunMetrics({events=[],problems=[],resourceObservations=[]}={}){
  if(!events.length) throw new Error('events_required');
  const sorted=[...events].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  const started=sorted[0].timestamp,ended=sorted.at(-1).timestamp;
  const wall=Math.max(0,(Date.parse(ended)-Date.parse(started))/1000);
  const stageSeconds={};
  for(const e of sorted){
    if(Number.isInteger(e.duration_ms)) stageSeconds[e.stage]=(stageSeconds[e.stage]||0)+e.duration_ms/1000;
  }
  const usage={
    dot_active_seconds:sum(sorted,e=>e.usage?.dot_active_seconds),
    work_active_seconds:sum(sorted,e=>e.usage?.work_active_seconds),
    native_image_generations:sum(sorted,e=>e.usage?.native_image_generations),
    web_queries:sum(sorted,e=>e.usage?.web_queries),
    github_writes:sum(sorted,e=>e.usage?.github_writes),
    estimated_charge:null,
    estimate_basis:'not_inferred_without_configured_rate_card'
  };
  const knownStage=sum(Object.values(stageSeconds),x=>x);
  const waits=Math.max(0,wall-knownStage);
  const byClass={};
  for(const p of problems) byClass[p.classification]=(byClass[p.classification]||0)+1;
  const resourceTotals={
    checked:resourceObservations.length,
    queries:sum(resourceObservations,x=>x.queries),
    candidates_found:sum(resourceObservations,x=>x.candidates_found),
    usable_candidates:sum(resourceObservations,x=>x.usable_candidates),
    selected_items:sum(resourceObservations,x=>x.selected_items),
    fresh_items:sum(resourceObservations,x=>x.fresh_items),
    failures:sum(resourceObservations,x=>(x.failures||[]).length)
  };
  const criticalPath=Object.entries(stageSeconds).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
  return {
    schema_version:'daily-compiler-run-metrics-v1',
    edition_date:sorted[0].edition_date,
    execution_id:sorted[0].execution_id,
    started_at:started,
    ended_at:ended,
    wall_seconds:wall,
    stage_seconds:stageSeconds,
    critical_path:criticalPath,
    wait_seconds:waits,
    retry_count:sorted.filter(x=>x.status==='RETRY').length,
    usage,
    problems:{count:problems.length,by_classification:byClass,open:problems.filter(x=>x.status==='open'||x.status==='external_blocker').length},
    resources:resourceTotals,
    image_metrics:{
      generations:usage.native_image_generations,
      studio_seconds:stageSeconds.IMAGES||0,
      work_porter_seconds:sum(sorted.filter(x=>x.actor==='work_porter'),e=>(e.duration_ms||0)/1000)
    },
    publication_metrics:{compile_seconds:stageSeconds.COMPILE||0,verify_seconds:stageSeconds.VERIFY||0}
  };
}

export function buildRunAnalysis({metrics,problems=[],resourceObservations=[]}={}){
  if(!metrics) throw new Error('metrics_required');
  const improvements=[];
  const stageEntries=Object.entries(metrics.stage_seconds||{}).sort((a,b)=>b[1]-a[1]);
  if(stageEntries[0]){
    improvements.push({
      priority:'P1',
      area:'speed',
      recommendation:'Review the longest stage '+stageEntries[0][0]+' first; it consumed '+Math.round(stageEntries[0][1])+' seconds.',
      expected_benefit:'Targets the measured critical-path contributor rather than a minor stage.',
      implementation_scope:'system_hardening'
    });
  }
  if(metrics.wait_seconds>metrics.wall_seconds*0.15){
    improvements.push({
      priority:'P1',
      area:'reliability',
      recommendation:'Reduce idle or waiting boundaries; measured wait time exceeds 15% of wall time.',
      expected_benefit:'Lower wall time without increasing model work.',
      implementation_scope:'next_run'
    });
  }
  if((metrics.usage?.work_active_seconds||0)>0){
    improvements.push({
      priority:'P2',
      area:'work_time',
      recommendation:'Inspect Work Porter events for operations that can move to deterministic GitHub Actions or direct connector calls.',
      expected_benefit:'Reduces Work Cloud time and associated charges while preserving exact-byte ingest.',
      implementation_scope:'system_hardening'
    });
  }
  if((metrics.usage?.dot_active_seconds||0)>0){
    improvements.push({
      priority:'P2',
      area:'dot_time',
      recommendation:'Keep Dot orchestration at stage boundaries only and push deterministic validation to repository code.',
      expected_benefit:'Reduces Dot active time while preserving autonomous coordination.',
      implementation_scope:'system_hardening'
    });
  }
  const lowYield=resourceObservations.filter(x=>x.queries>0&&x.usable_candidates===0);
  if(lowYield.length){
    improvements.push({
      priority:'P2',
      area:'sources',
      recommendation:'Review '+lowYield.length+' resources that produced zero usable candidates despite being queried.',
      expected_benefit:'Reduces wasted research time and improves source mix.',
      implementation_scope:'monitor'
    });
  }
  if(problems.some(x=>x.recurrence==='repeat')){
    improvements.push({
      priority:'P0',
      area:'reliability',
      recommendation:'Prioritize permanent fixes for repeated problems before adding new runtime complexity.',
      expected_benefit:'Prevents recurring failures from consuming future run time.',
      implementation_scope:'system_hardening'
    });
  }
  return {
    schema_version:'daily-compiler-run-analysis-v1',
    edition_date:metrics.edition_date,
    execution_id:metrics.execution_id,
    result:problems.some(x=>x.status==='open')?'PASS_WITH_ISSUES':'PASS',
    timing_summary:{wall_seconds:metrics.wall_seconds,stage_seconds:metrics.stage_seconds,wait_seconds:metrics.wait_seconds,critical_path:metrics.critical_path},
    quality_summary:{image_generations:metrics.image_metrics?.generations??null,accepted_image_regenerations:0},
    resource_summary:metrics.resources,
    cost_efficiency:{
      dot_active_seconds:metrics.usage?.dot_active_seconds??0,
      work_active_seconds:metrics.usage?.work_active_seconds??0,
      estimated_charge:null,
      estimate_basis:'not_inferred_without_configured_rate_card'
    },
    problems,
    improvements
  };
}
