// Stable public IDs are independent of display copy; collisions must be resolved before publication.
export function normalizedWatchlistTitle(value){
  return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
export function activeWatchlistTitleCollisions(topics){
  const seen=new Map(),collisions=[];
  for(const item of topics||[]){
    if(item?.status==='archived')continue;
    const title=normalizedWatchlistTitle(item?.name);
    if(!title)throw Error('Watchlist active topic missing title: '+item?.topic_id);
    if(seen.has(title)&&seen.get(title)!==item.topic_id)
      collisions.push({normalized_title:title,topic_ids:[seen.get(title),item.topic_id]});
    else seen.set(title,item.topic_id);
  }
  return collisions;
}
export function requireDistinctWatchlistTitles(topics){
  const collisions=activeWatchlistTitleCollisions(topics);
  if(collisions.length)throw Error('duplicate_active_watchlist_titles:'+JSON.stringify(collisions));
  return {result:'PASS',active_unique_titles:new Set((topics||[]).filter(t=>t.status!=='archived').map(t=>normalizedWatchlistTitle(t.name))).size};
}
