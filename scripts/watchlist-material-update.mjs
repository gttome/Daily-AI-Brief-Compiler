// Update the evidence and every current-edition copy of the daily counts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {requireWatchlistCopy} from '../compiler/watchlist-copy.mjs';
import {requireWatchlistScoring} from '../compiler/watchlist-rubric.mjs';
import {scoreTopic,watchlistDailyState} from '../vendor/production-reader/snapshot/_generator/lib/watchlist.mjs';
import {renderDailyTopicGroups} from '../vendor/production-reader/snapshot/assets/js/watchlist-daily.js';
import {renderWatchlistEvidence} from '../vendor/production-reader/snapshot/assets/js/watchlist-evidence.js';

function replaceOnce(text, before, after, route) {
  const index=text.indexOf(before);
  if(index<0 || text.indexOf(before,index+before.length)!==-1) {
    throw Error('Expected one matching Watchlist section in '+route);
  }
  return text.slice(0,index)+after+text.slice(index+before.length);
}

const escapeHtml=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function researchCard(topic) {
  return '<section class="wl-card" id="'+escapeHtml(topic.topic_id)+'"><h2>'+escapeHtml(topic.name)+'</h2><p>'+
    escapeHtml(topic.summary)+'</p><p><strong>Why now:</strong> '+escapeHtml(topic.why_now)+
    '</p><p><strong>Potential value:</strong> '+escapeHtml(topic.practical_value)+'</p>'+
    renderWatchlistEvidence(topic)+'</section>';
}

export function materialWatchlistPages({revision,watch,historySite}) {
  const date=watch.edition_date;
  const [item]=revision.items;
  const topic=watch.topics.find(t=>t.topic_id===item.topic_id);
  if(revision.items.length!==1 || !topic || topic.status==='archived' ||
     watchlistDailyState(topic,date)!=='carried_forward' ||
     crypto.createHash('sha256').update(JSON.stringify(topic)).digest('hex')!==item.expected_topic_sha256) {
    throw Error('Material Watchlist update requires the exact previously published carried topic');
  }
  const checked=revision.reviewed_at;
  if(!Number.isFinite(Date.parse(checked)) || !checked.startsWith(date+'T') ||
     !Array.isArray(item.evidence) || !item.evidence.length)throw Error('Missing dated Watchlist review');
  const ids=new Set(topic.evidence.map(e=>e.development_id));
  for(const entry of item.evidence) {
    if(!entry.development_id || ids.has(entry.development_id) || entry.checked_at!==checked ||
       !entry.title || !entry.publisher || !entry.review_depth || new URL(entry.url).protocol!=='https:') {
      throw Error('Invalid or duplicate material evidence record');
    }
    ids.add(entry.development_id);
  }
  requireWatchlistCopy(item,topic.topic_id);
  requireWatchlistScoring({rubric:item.rubric,momentum:topic.momentum},topic.topic_id);
  const beforeGroups=renderDailyTopicGroups(watch);
  const beforeCard=researchCard(topic);
  Object.assign(topic,{summary:item.summary,why_now:item.why_now,practical_value:item.practical_value,
    limitations:item.limitations,next_action:item.next_action,rubric:item.rubric,updated_at:checked,
    verification_observed_at:checked});
  topic.evidence.push(...item.evidence);
  topic.research_score=scoreTopic(topic);
  watch.updated_at=checked;
  const afterGroups=renderDailyTopicGroups(watch);
  const pages=new Map();
  for(const route of ['index.html','latest.html','latest.md','briefs/'+date+'/index.html','watchlist/research/index.html']) {
    const original=fs.readFileSync(path.join(historySite,route),'utf8');
    let page=replaceOnce(original,beforeGroups,afterGroups,route);
    if(route==='watchlist/research/index.html')page=replaceOnce(page,beforeCard,researchCard(topic),route);
    pages.set(route,page);
  }
  return pages;
}
