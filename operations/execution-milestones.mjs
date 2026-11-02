// Record observed clock events. Never substitute a reseal time for execution start.
export function appendExecutionMilestone(previous,{edition_date,execution_id,event,observed_at,source_ref}){
 if(!/^20\d\d-\d\d-\d\d$/.test(edition_date||'')||!execution_id||
  !['EXECUTION_OBSERVED','FAILURE_OBSERVED','RECOVERY_OBSERVED','BUNDLE_SEALED','PUBLIC_READER_VERIFIED'].includes(event)||
  !Number.isFinite(Date.parse(observed_at))||typeof source_ref!=='string'||!source_ref.trim())throw Error('invalid_execution_milestone');
 if(previous&&(previous.schema_version!=='daily-compiler-execution-milestones-v1'||previous.edition_date!==edition_date||previous.execution_id!==execution_id||!Array.isArray(previous.events)))throw Error('milestone_identity_mismatch');
 const events=[...(previous?.events||[])];
 if(events.some(e=>e.event===event&&e.observed_at===observed_at&&e.source_ref===source_ref))return previous;
 if(events.length&&Date.parse(observed_at)<Date.parse(events.at(-1).observed_at))throw Error('milestone_clock_regression');
 events.push({event,observed_at,source_ref});
 return {schema_version:'daily-compiler-execution-milestones-v1',edition_date,execution_id,
  initial_execution_observed_at:events.find(e=>e.event==='EXECUTION_OBSERVED')?.observed_at??null,
  events,scheduler_origin_attested:false};
}
