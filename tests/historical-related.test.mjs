import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifiedHistoricalRelation} from '../compiler/historical-related.mjs';

const archive={
  schema_version:'1.0.0',
  stories:[{
    content_type:'Article',
    url:'/stories/2026-10-18/agent-memory-and-recovery/',
    brief_date:'2026-10-18',
    headline:'Agent memory and recovery limits',
    availability_status:'available'
  }]
};
const candidate={
  url:'/stories/2026-10-18/agent-memory-and-recovery/',
  headline:'Agent memory and recovery limits',
  relationship:'builds_on',
  connection:'The earlier article documented recovery limits for agent memory; this story adds concrete validation gates before an assistant may reuse a restored state.'
};
const args={editionDate:'2026-10-20',archive,publicBase:'https://gttome.github.io/Daily-AI-Brief-Compiler'};
test('earlier article omitted when producer supplies no evidenced historical link',()=>{
  assert.equal(verifiedHistoricalRelation({...args,candidate:null}),null);
  assert.equal(verifiedHistoricalRelation({...args,candidate:undefined}),null);
});
test('named prior article resolves only through published archive identity',()=>{
  const result=verifiedHistoricalRelation({...args,candidate});
  assert.equal(result.brief_date,'2026-10-18');
  assert.equal(result.title,archive.stories[0].headline);
  assert.equal(result.url,'https://gttome.github.io/Daily-AI-Brief-Compiler'+candidate.url);
  assert.equal(result.connection,candidate.connection);
});
test('stale fixture, missing archive, wrong date, unknown route and headline fail closed',()=>{
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate,archive:null}),/verified published archive index/);
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate,editionDate:'2026-10-18'}),/previous dated article/);
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate:{...candidate,url:'/stories/2026-10-17/another-story/'}}),/not verified/);
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate:{...candidate,headline:'Fabricated title'}}),/not verified/);
});
test('rejects generic cross-edition summaries and unsubstantiated link text',()=>{
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate:{...candidate,connection:'Other October 20 stories examine failover, modular models, governed knowledge, independent evidence and reusable procedures.'}}),/generic or insufficient/);
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate:{...candidate,connection:'See companion October 20 coverage for other engineering developments across the field and broad changes in workflows.'}}),/generic or insufficient/);
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate:{...candidate,connection:'This is relevant.'}}),/generic or insufficient/);
  assert.throws(()=>verifiedHistoricalRelation({...args,candidate:{...candidate,relationship:'same_focus'}}),/relationship type/);
});
test('reader materializer no longer promotes current-edition related_coverage or the Oct 6 snapshot to Earlier Brief',()=>{
  const source=fs.readFileSync(new URL('../compiler/reader-materializer.mjs',import.meta.url),'utf8');
  assert.ok(source.includes('candidate:original?.historical_related'));
  assert.ok(source.includes('if(verifiedRelated)row.related=verifiedRelated;'));
  assert.ok(!source.includes('const priorStory='));
  assert.ok(!source.includes("connection:original?.related_coverage"));
  assert.ok(!source.includes('latestPreviousEdition('));
  const workflow=fs.readFileSync(new URL('../.github/workflows/shadow-compile.yml',import.meta.url),'utf8');
  assert.ok(workflow.includes('git show "$PRIOR_WATCHLIST_HISTORY_HEAD:site/data/archive-index.json" > prior-archive.json'));
  assert.ok(workflow.includes('--prior-archive prior-archive.json'));
});
