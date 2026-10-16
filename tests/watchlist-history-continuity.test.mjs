import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {requirePublishedPriorWatchlist} from '../compiler/reader-materializer.mjs';
import {adaptCompilerBundle,canonicalWatchTopicId} from '../compiler/reader-adapter.mjs';
import {publicWatchlist,scoreTopic} from '../vendor/production-reader/snapshot/_generator/lib/watchlist.mjs';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const text={
  summary:'Tool permissions constrain an automated action through explicit configuration and auditable access boundaries.',
  why_now:'A dated original report documents a constrained capability that now merits further evaluation.',
  practical_value:'Professional teams can test both approved and rejected actions within a narrow workflow.'
};
const rubric={
  novelty:{score:4,reason:'The new capability limits behavior that previously lacked this particular scoped implementation.'},
  evidence:{score:4,reason:'The source explains implementation details while leaving independent production benchmarks unverified.'},
  independence:{score:1,reason:'Only one original publisher has described this specific development so far.'},
  momentum:{score:null,reason:'There are no comparable dated numerical observations for this new capability.'},
  relevance:{score:5,reason:'Teams can evaluate permission checks and human escalation with an explicit test.'},
  durability:{score:4,reason:'Permission control remains a durable requirement even as vendor implementations change.'}
};
function previous(){
  const initial=read('vendor/production-reader/snapshot/_data/watchlist.json');
  const topic=structuredClone(initial.topics[0]);
  Object.assign(topic,{topic_id:'dab-topic-previous-edition-only',name:'Preserved finding from the previous published edition',
    first_detected:'2026-10-16',updated_at:'2026-10-16T12:00:00Z',...text,
    rubric:structuredClone(rubric),evidence:[{...topic.evidence[0],url:'https://research.example.org/new'}]});
  return publicWatchlist({...initial,edition_date:'2026-10-16',topics:[...initial.topics,topic]});
}
function nextBundle(){
  const bundle=read('fixtures/complete-edition/edition-bundle.json');
  bundle.edition_date='2026-10-17';
  for(const kind of ['new','updated','carried_forward','dropped'])
    bundle.watchlist[kind]=bundle.watchlist[kind].map(item=>({
      ...item,...text,rubric:structuredClone(rubric),
      evidence:{url:'https://research.example.org/'+kind,date:'2026-10-16'}
    }));
  return bundle;
}
test('new editions preserve every verified previous topic and its reviewed score',()=>{
  const prior=previous();
  const frozen=requirePublishedPriorWatchlist(prior,'2026-10-17',scoreTopic);
  const merged=publicWatchlist(adaptCompilerBundle(nextBundle(),{priorWatchlist:frozen}).watchlist);
  const extra=prior.topics.find(x=>x.topic_id==='dab-topic-previous-edition-only');
  const copied=merged.topics.find(x=>x.topic_id===extra.topic_id);
  assert.ok(copied,'topic not mentioned in today’s small changed subset must survive');
  assert.equal(copied.research_score,extra.research_score);
  assert.deepEqual(copied.rubric,extra.rubric);
  assert.ok(prior.topics.every(x=>merged.topics.some(t=>t.topic_id===x.topic_id)));
  assert.equal(prior.topics.length,22,'previous state is not modified by adaptation');
});
test('publisher rejects missing, stale, duplicate, malformed and unscored previous Watchlists',()=>{
  const prior=previous();
  assert.throws(()=>requirePublishedPriorWatchlist(null,'2026-10-17',scoreTopic),/prior Watchlist/);
  assert.throws(()=>requirePublishedPriorWatchlist({...prior,edition_date:'2026-10-17'},'2026-10-17',scoreTopic),/prior Watchlist/);
  const dup=structuredClone(prior);dup.topics.push(structuredClone(dup.topics[0]));
  assert.throws(()=>requirePublishedPriorWatchlist(dup,'2026-10-17',scoreTopic),/duplicate identity/);
  const unscored=structuredClone(prior);delete unscored.topics[0].research_score;
  assert.throws(()=>requirePublishedPriorWatchlist(unscored,'2026-10-17',scoreTopic),/missing or inconsistent research score/);
  const tampered=structuredClone(prior);tampered.topics[0].research_score=0;
  assert.throws(()=>requirePublishedPriorWatchlist(tampered,'2026-10-17',scoreTopic),/missing or inconsistent research score/);
});
test('carried-forward topics reuse prior rubric; attempted re-scoring requires Updated classification',()=>{
  const prior=previous(),bundle=nextBundle();
  const carried=bundle.watchlist.carried_forward[0];
  carried.topic=prior.topics[0].name;
  delete carried.rubric;
  const id=canonicalWatchTopicId(carried);
  const adapted=adaptCompilerBundle(bundle,{priorWatchlist:prior}).watchlist;
  assert.deepEqual(adapted.topics.find(t=>t.topic_id===id).rubric,
    prior.topics.find(t=>t.topic_id===id).rubric);
  carried.rubric=structuredClone(prior.topics.find(t=>t.topic_id===id).rubric);
  carried.rubric.novelty.score=carried.rubric.novelty.score===5?4:5;
  assert.throws(()=>adaptCompilerBundle(bundle,{priorWatchlist:prior}),/rubric changed without Updated classification/);
});
