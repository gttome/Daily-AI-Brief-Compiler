import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adaptCompilerBundle} from '../compiler/reader-adapter.mjs';
import {WATCHLIST_RUBRIC_EFFECTIVE,WATCHLIST_RUBRIC_KEYS,watchlistRubricProblems,isSyntheticSixty} from '../compiler/watchlist-rubric.mjs';

const text={
 summary:'Agent policy checks constrain the actions an automated tool may attempt across external systems.',
 why_now:'A dated original publisher announcement provides concrete changes requiring careful technical evaluation.',
 practical_value:'Professional teams can compare the new behavior against narrow scope and human review tests.'
};
const reasons={
 novelty:'The announcement adds a narrowly scoped but concrete technical control to an existing implementation.',
 evidence:'Original publisher documentation describes the design, though independent operational results remain unavailable.',
 independence:'This topic has one original published source, not two independent corroborating developments.',
 momentum:'No comparable previous observations are documented, so measured momentum is unknown for this topic.',
 relevance:'Professionals can inspect source-scoped tool permissions and reproduce the documented expected behavior.',
 durability:'Permission controls and verifiable actions remain valuable as tools and model implementations evolve.'
};
const rubric={
 novelty:{score:4,reason:reasons.novelty},
 evidence:{score:4,reason:reasons.evidence},
 independence:{score:1,reason:reasons.independence},
 momentum:{score:null,reason:reasons.momentum},
 relevance:{score:5,reason:reasons.relevance},
 durability:{score:4,reason:reasons.durability}
};
test('future research rubrics are criterion-specific, never six recycled 3/5 entries',()=>{
 assert.equal(WATCHLIST_RUBRIC_EFFECTIVE,'2026-10-16');
 assert.equal(WATCHLIST_RUBRIC_KEYS.length,6);
 assert.deepEqual(watchlistRubricProblems(rubric),[]);
 const generic=Object.fromEntries(WATCHLIST_RUBRIC_KEYS.map(k=>[k,{score:3,reason:'A generic sentence is copied to every scoring criterion and says nothing about that criterion.'}]));
 assert.ok(watchlistRubricProblems(generic).some(s=>/uniform 3\/5/.test(s)));
 assert.equal(isSyntheticSixty({research_score:60,rubric:generic}),true);
 assert.equal(isSyntheticSixty({research_score:62,rubric}),false);
 assert.ok(watchlistRubricProblems({...rubric,momentum:{score:3,reason:rubric.evidence.reason}}).some(s=>/duplicated/.test(s)));
});
test('October 16 adapter rejects missing rubric and accepts six distinct source-bound reasons',()=>{
 const bundle=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
 bundle.edition_date='2026-10-16';
 for(const kind of ['new','updated','carried_forward','dropped']){
  bundle.watchlist[kind]=bundle.watchlist[kind].map(t=>({...t,...text,rubric:structuredClone(rubric)}));
 }
 const adapted=adaptCompilerBundle(bundle);
 assert.equal(adapted.watchlist.topics.length,4);
 for(const topic of adapted.watchlist.topics)assert.deepEqual(topic.rubric,rubric);
 const invalid=structuredClone(bundle);
 delete invalid.watchlist.new[0].rubric;
 assert.throws(()=>adaptCompilerBundle(invalid),/missing criterion-specific research rubric/);
 const cloned=structuredClone(bundle);
 for(const k of WATCHLIST_RUBRIC_KEYS)cloned.watchlist.updated[0].rubric[k]={score:3,reason:'A generic sentence is copied to every scoring criterion and says nothing about that criterion.'};
 assert.throws(()=>adaptCompilerBundle(cloned),/duplicated rubric rationale|uniform 3\/5 default rubric/);
});
