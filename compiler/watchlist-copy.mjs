// Production editorial requirement: these three reader sections have different jobs.
// Do not synthesize them by repeating a single change/evidence sentence.
export const WATCHLIST_COPY_EFFECTIVE='2026-10-14';
export const WATCHLIST_COPY_FIELDS=Object.freeze(['summary','why_now','practical_value']);

const clean=v=>String(v??'').trim().replace(/\s+/g,' ');
const norm=v=>clean(v).toLocaleLowerCase().replace(/[^\p{L}\p{N} ]/gu,'').replace(/\s+/g,' ').trim();
const tokens=v=>new Set(norm(v).split(' ').filter(Boolean));
function overlap(a,b){
  const left=tokens(a),right=tokens(b);
  if(!left.size||!right.size)return 0;
  const shared=[...left].filter(x=>right.has(x)).length;
  return shared/(left.size+right.size-shared);
}
export function watchlistCopyProblems(entry,{minimumWords=7}={}){
  const errors=[];
  for(const field of WATCHLIST_COPY_FIELDS){
    const copy=clean(entry?.[field]);
    if(!copy||copy.split(/\s+/).length<minimumWords||copy.length<35)
      errors.push(field+': missing or too thin');
  }
  for(let i=0;i<WATCHLIST_COPY_FIELDS.length;i++){
    for(let j=i+1;j<WATCHLIST_COPY_FIELDS.length;j++){
      const left=WATCHLIST_COPY_FIELDS[i],right=WATCHLIST_COPY_FIELDS[j];
      const a=entry?.[left],b=entry?.[right];
      if(!clean(a)||!clean(b))continue;
      if(norm(a)===norm(b)||overlap(a,b)>=0.83)
        errors.push(left+' and '+right+': repeated or substantially overlapping copy');
    }
  }
  return errors;
}
export function requireWatchlistCopy(entry,label='Watchlist topic'){
  const issues=watchlistCopyProblems(entry);
  if(issues.length)throw new Error(label+': '+issues.join('; '));
}
