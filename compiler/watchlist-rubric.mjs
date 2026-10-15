// The public research score is an editorial judgement grounded in independently
// explained criterion evidence. Never synthesize an even 60/100 default.
export const WATCHLIST_RUBRIC_EFFECTIVE='2026-10-16';
export const WATCHLIST_RUBRIC_KEYS=Object.freeze([
  'novelty','evidence','independence','momentum','relevance','durability'
]);
const normalize=value=>String(value??'').toLocaleLowerCase().trim().replace(/\s+/g,' ');
export function watchlistRubricProblems(rubric){
  const errors=[];
  if(!rubric||typeof rubric!=='object'||Array.isArray(rubric))return ['missing criterion-specific research rubric'];
  const actual=Object.keys(rubric);
  if(actual.length!==WATCHLIST_RUBRIC_KEYS.length||actual.some(k=>!WATCHLIST_RUBRIC_KEYS.includes(k)))
    errors.push('rubric must contain exactly the six weighted criteria');
  const reasons=new Set();
  for(const key of WATCHLIST_RUBRIC_KEYS){
    const entry=rubric[key];
    if(!entry||!Object.prototype.hasOwnProperty.call(entry,'score')||
      !(entry.score===null||(Number.isInteger(entry.score)&&entry.score>=0&&entry.score<=5)))
      errors.push(key+': requires an integer 0–5 or null when not established');
    const reason=String(entry?.reason??'').trim();
    if(reason.length<42||reason.split(/\s+/).length<7)
      errors.push(key+': requires a substantive criterion-specific evidence explanation');
    if(reasons.has(normalize(reason)))errors.push(key+': duplicated rubric rationale');
    reasons.add(normalize(reason));
  }
  if(WATCHLIST_RUBRIC_KEYS.every(key=>rubric[key]?.score===3))
    errors.push('uniform 3/5 default rubric is prohibited');
  return errors;
}
export function requireWatchlistRubric(rubric,label){
  const issues=watchlistRubricProblems(rubric);
  if(issues.length)throw new Error(label+': '+issues.join('; '));
  return rubric;
}
// Distinguish the historic adapter's six identical 3/5 reasons from genuine
// occasional individual 60/100 topic evaluations.
export function isSyntheticSixty(topic){
  if(topic?.research_score!==60)return false;
  const rubric=topic.rubric;
  const reasons=WATCHLIST_RUBRIC_KEYS.map(k=>normalize(rubric?.[k]?.reason));
  return WATCHLIST_RUBRIC_KEYS.every(k=>rubric?.[k]?.score===3)&&reasons[0].length>0&&reasons.every(x=>x===reasons[0]);
}
