export const FUTURE_SUGGESTION_SCHEMA='daily-compiler-future-brief-suggestion-v1';

export function validateFutureSuggestion(s={}){
  const errors=[];
  if(s.schema_version!==FUTURE_SUGGESTION_SCHEMA) errors.push('future_schema');
  for(const k of ['suggestion_id','created_at','created_by','content_type','mode','status','priority','dedupe_key']){
    if(!s[k]) errors.push('future_'+k);
  }
  if(s.target_date!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(s.target_date||'')) errors.push('future_target_date');
  if(!['article','story_topic','image','video','podcast','watchlist','resource_source'].includes(s.content_type)) errors.push('future_content_type');
  if(!['suggest','must_consider','must_include_if_valid'].includes(s.mode)) errors.push('future_mode');
  if(!['queued','considered','selected','rejected','expired','carried_forward'].includes(s.status)) errors.push('future_status');
  if(!['urgent','high','normal','low'].includes(s.priority)) errors.push('future_priority');
  if(!s.payload||typeof s.payload!=='object'||Array.isArray(s.payload)) errors.push('future_payload');
  return [...new Set(errors)];
}

export function suggestionsForDate(suggestions=[],date){
  return suggestions.filter(s=>{
    const errors=validateFutureSuggestion(s);
    if(errors.length) throw new Error(errors.join(';'));
    if(!['queued','carried_forward'].includes(s.status)) return false;
    return s.target_date===null||s.target_date===date;
  }).sort((a,b)=>{
    const p={urgent:0,high:1,normal:2,low:3};
    return p[a.priority]-p[b.priority]||Date.parse(a.created_at)-Date.parse(b.created_at);
  });
}

export function resolveSuggestion(s,{status,resolution}={}){
  if(!['considered','selected','rejected','expired','carried_forward'].includes(status)) throw new Error('future_resolution_status');
  return {...structuredClone(s),status,resolution:resolution??null};
}
