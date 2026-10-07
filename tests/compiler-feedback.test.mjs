import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFeedbackWorker} from '../feedback-runtime/worker.mjs';
import {adaptCompilerBundle} from '../compiler/reader-adapter.mjs';
import {
  compilerFeedbackRegistry,
  compilerStoryFeedbackId,
  isCompilerFeedbackItem,
  isCompilerReaderEventItem
} from '../compiler/feedback-identity.mjs';

const origin='https://gttome.github.io';
const service='https://dab-compiler-feedback.gtome.chatgpt.site';
const edition='2026-10-07';
const item=compilerStoryFeedbackId(edition,'dots-always-on-agents');

function memoryStore(){
  const operations=new Map(),comments=new Map(),votes=new Map();
  return {
    async aggregate(e,i,k){
      const totals={};
      for(const row of operations.values())if(row.edition===e&&row.item===i&&row.kind===k)totals[row.value]=(totals[row.value]||0)+1;
      return totals;
    },
    async saveFact(row){
      if(!operations.has(row.operation))operations.set(row.operation,{...row});
      const saved=operations.get(row.operation);
      let count=0;
      for(const fact of operations.values())if(fact.edition===row.edition&&fact.item===row.item&&fact.kind===row.kind&&fact.value===String(row.value))count++;
      return {saved:{kind:saved.kind,edition:saved.edition,item:saved.item,value:String(saved.value)},count};
    },
    async saveComment(row){
      if(!comments.has(row.operation))comments.set(row.operation,{...row});
      return comments.get(row.operation);
    },
    async comments(e,i){
      return [...comments.values()].filter(row=>row.edition===e&&row.item===i).sort((a,b)=>b.createdAt-a.createdAt).map(row=>({body:row.body,created_at:row.createdAt}));
    },
    async saveVote(row){
      const key=row.topic+'|'+row.ballot,prior=votes.get(key);
      if(!prior||row.revision>prior.revision)votes.set(key,{choice:row.choice,revision:row.revision});
      return votes.get(key);
    },
    async watchlistTotals(){
      const grouped=new Map();
      for(const [key,row] of votes){
        const topic=key.split('|')[0],k=topic+'|'+row.choice;
        grouped.set(k,(grouped.get(k)||0)+1);
      }
      return [...grouped].map(([key,count])=>{const [topic_id,choice]=key.split('|');return {topic_id,choice,count};});
    }
  };
}
function call(worker,store,path,{method='GET',body,operation=crypto.randomUUID(),requestOrigin=origin}={}){
  const init={method,headers:{origin:requestOrigin}};
  if(body!==undefined){
    init.headers['content-type']='application/json';
    init.headers['x-operation-id']=operation;
    init.body=JSON.stringify(body);
  }
  return worker.fetch(new Request(service+path,init),{STORE:store});
}

test('Compiler feedback IDs are isolated from production slot identities',()=>{
  assert.equal(item,'dab-story-compiler-2026-10-07-dots-always-on-agents');
  assert.equal(isCompilerFeedbackItem(edition,item),true);
  assert.equal(isCompilerFeedbackItem(edition,'dab-story-2026-10-07-m01'),false);
  assert.equal(isCompilerReaderEventItem(edition,'dab-story-2026-10-07-m01'),true);
});

test('rating writes and aggregate reads succeed without a production registry',async()=>{
  const worker=createFeedbackWorker(),store=memoryStore(),operation=crypto.randomUUID();
  const body={brief_date:edition,item_id:item,rating:5};
  const first=await call(worker,store,'/api/ratings',{method:'POST',body,operation});
  assert.equal(first.status,201);assert.deepEqual(await first.json(),{recorded:true,count:1});
  const retry=await call(worker,store,'/api/ratings',{method:'POST',body,operation});
  assert.equal(retry.status,201);assert.deepEqual(await retry.json(),{recorded:true,count:1});
  const totals=await call(worker,store,'/api/ratings?brief_date='+edition+'&item_id='+encodeURIComponent(item));
  assert.deepEqual((await totals.json()).totals,{'5':1});
});

test('public comments save successfully and remain queryable without owner authorization',async()=>{
  const worker=createFeedbackWorker(),store=memoryStore();
  const body={brief_date:edition,item_id:item,body:'Useful explanation.'};
  const response=await call(worker,store,'/api/comments',{method:'POST',body});
  assert.equal(response.status,201);assert.deepEqual(await response.json(),{recorded:true});
  const read=await call(worker,store,'/api/comments?brief_date='+edition+'&item_id='+encodeURIComponent(item));
  const payload=await read.json();
  assert.equal(read.status,200);assert.equal(payload.comments.length,1);assert.equal(payload.comments[0].body,'Useful explanation.');
});

test('Watchlist vote can be changed immediately with a monotonic revision',async()=>{
  const worker=createFeedbackWorker(),store=memoryStore(),ballot=crypto.randomUUID(),topic='dab-topic-trusted-enterprise-context';
  let response=await call(worker,store,'/api/watchlist',{method:'POST',body:{topic_id:topic,ballot,choice:'very_interested',revision:1}});
  assert.equal(response.status,200);assert.equal((await response.json()).recorded,true);
  response=await call(worker,store,'/api/watchlist',{method:'POST',body:{topic_id:topic,ballot,choice:'somewhat_interested',revision:2}});
  assert.deepEqual(await response.json(),{recorded:true,choice:'somewhat_interested',revision:2});
  const totals=await call(worker,store,'/api/watchlist');
  assert.deepEqual((await totals.json()).totals,[{topic_id:topic,choice:'somewhat_interested',count:1}]);
});

test('share counter accepts canonical reader IDs only inside the isolated store',async()=>{
  const worker=createFeedbackWorker(),store=memoryStore(),canonical='dab-story-2026-10-07-m01';
  const response=await call(worker,store,'/api/events',{method:'POST',body:{brief_date:edition,item_id:canonical,metric:'share_initiations'}});
  assert.equal(response.status,201);assert.equal((await response.json()).recorded,true);
});

test('rating and comment writes reject production IDs and cross-origin requests',async()=>{
  const worker=createFeedbackWorker(),store=memoryStore();
  let response=await call(worker,store,'/api/ratings',{method:'POST',body:{brief_date:edition,item_id:'dab-story-2026-10-07-m01',rating:5}});
  assert.equal(response.status,400);
  response=await call(worker,store,'/api/ratings',{method:'POST',body:{brief_date:edition,item_id:item,rating:5},requestOrigin:'https://evil.example'});
  assert.equal(response.status,403);
});

test('sealed bundle deterministically yields ten Compiler feedback items with no semantic rework',()=>{
  const bundle=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
  const prior=JSON.parse(fs.readFileSync('vendor/production-reader/snapshot/_data/watchlist.json','utf8'));
  const adapted=adaptCompilerBundle(bundle,{priorWatchlist:prior});
  const registry=compilerFeedbackRegistry(bundle,adapted.edition,adapted.watchlist);
  assert.equal(registry.items.length,10);
  assert.ok(registry.items.every(row=>row.feedback_id.includes('-compiler-')));
  assert.equal(new Set(registry.items.map(row=>row.feedback_id)).size,10);
  assert.equal(registry.semantic_rework,0);
  assert.equal(registry.accepted_image_regenerations,0);
});
