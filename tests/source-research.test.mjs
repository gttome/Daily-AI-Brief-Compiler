import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESEARCH_FOCUS,RESEARCH_LIMITS,boundResearchCandidates,
  validateEditorialResearch,validateResearchEnvelope,researchEvidenceCharacters
} from '../producer/research.mjs';
import {mediaDurationBand} from '../compiler/media.mjs';

// Synthetic inputs only: no future edition is selected and no real files change.
function candidate(id,{focus=RESEARCH_FOCUS[0],type='article',score=100,...extra}={}){
  return {
    id,url:`https://example.com/${type}/${id}`,resource_id:'synthetic-qualified-route',type,focus,
    agent_skills:false,score,source_supported:true,route_qualified:true,
    original_publication:{original_value:'2026-10-07',precision:'date',timezone:null},
    evidence_refs:[`evidence:${id}`],title:`Synthetic metadata ${id}`,...extra
  };
}
const packet=c=>({candidate_id:c.id,evidence_text:'Synthetic item evidence binds an observed fact to its exact source for the research-boundary test.',source_refs:[c.url]});
function validResearch(){
  const candidates=RESEARCH_FOCUS.flatMap((focus,f)=>[0,1].map(n=>candidate(`article-${f}-${n}`,{focus,agent_skills:f===2&&n===1})));
  const bound=boundResearchCandidates(candidates);
  return {
    retained_articles:bound.retained_articles,deep_packets:bound.retained_articles.map(packet),
    selected_ids:bound.retained_articles.map(c=>c.id),media:bound.media
  };
}
const has=(result,part)=>result.some(error=>error.includes(part));

test('I05-T05: large technical pool retains balanced metadata and a low-ranked reusable Skill',()=>{
  const pool=RESEARCH_FOCUS.flatMap((focus,f)=>Array.from({length:40},(_,n)=>candidate(`${f}-${n}`,{
    focus,score:f===0?10000-n:100-n,agent_skills:f===2&&n===39
  })));
  const before=structuredClone(pool), bounded=boundResearchCandidates(pool);
  assert.equal(bounded.retained_articles.length,20);
  assert.deepEqual(RESEARCH_FOCUS.map(f=>bounded.retained_articles.filter(c=>c.focus===f).length),[7,7,6]);
  assert.ok(bounded.retained_articles.some(c=>c.id==='2-39'),'qualified Skill survives its low caller ranking');
  assert.equal(bounded.not_retained.length,100);
  assert.deepEqual(bounded.coverage_gaps,[]);
  assert.deepEqual(pool,before,'ranking and metadata preparation do not modify original source observations');
  assert.equal(Object.hasOwn(bounded,'selected_ids'),false,'retention is not final editorial selection');
});

test('I05-T05: media discovery has independent finite caps and preserves date-only precision',()=>{
  const articles=Array.from({length:30},(_,n)=>candidate(`a${n}`,{focus:RESEARCH_FOCUS[n%3],agent_skills:n===2}));
  const media=['video','podcast'].flatMap(type=>Array.from({length:30},(_,n)=>candidate(`${type}${n}`,{type})));
  const bounded=boundResearchCandidates([...articles,...media]);
  assert.equal(bounded.retained_articles.length,20);
  assert.equal(bounded.media.video.length,12);
  assert.equal(bounded.media.podcast.length,12);
  assert.deepEqual(bounded.retained_articles[0].original_publication,{original_value:'2026-10-07',precision:'date',timezone:null});
  assert.equal(bounded.media.video[0].duration_seconds,null);
  assert.equal(bounded.media.video[0].media_admission,'NOT_RUN');
  assert.equal(bounded.media.video[0].discovery_only,true);
});

test('unqualified routes, malformed metadata and embedded raw documents cannot enter retained context',()=>{
  const inputs=[
    candidate('route',{route_qualified:false}),
    candidate('date',{original_publication:{original_value:'2026-02-30',precision:'date',timezone:null}}),
    candidate('raw',{body:'Unbounded source page text.'}),
    candidate('nested',{notes:{raw_text:'Raw text hidden in nested metadata.'}}),
    candidate('oversized',{description:'x'.repeat(5000)}),
    candidate('score',{score:Infinity}),
    candidate('supported',{source_supported:false})
  ];
  const bounded=boundResearchCandidates(inputs);
  assert.deepEqual(bounded.retained_articles.map(c=>c.id),['supported'],'unreviewed metadata remains a lead, not selected source proof');
  assert.equal(bounded.not_retained.find(c=>c.id==='route').reason,'route_unqualified');
  assert.equal(bounded.not_retained.find(c=>c.id==='date').reason,'candidate_publication');
  assert.equal(bounded.not_retained.find(c=>c.id==='raw').reason,'raw_source_text_not_metadata');
  assert.equal(bounded.not_retained.find(c=>c.id==='nested').reason,'raw_source_text_not_metadata');
  assert.equal(bounded.not_retained.find(c=>c.id==='oversized').reason,'metadata_size_limit');
});

test('renamed source excerpts and arbitrary nested metadata cannot bypass the deep-evidence budget',()=>{
  const fields=['substantive_support','evidence_summary','summary','abstract','snippet','analysis','notes','annotation','renamed_excerpt'];
  const inputs=fields.map(field=>candidate(field,{[field]:'A source excerpt renamed as metadata '.repeat(15)}));
  const bounded=boundResearchCandidates(inputs);
  assert.equal(bounded.retained_articles.length,0);
  assert.equal(bounded.not_retained.length,fields.length);
  assert.ok(bounded.not_retained.every(result=>result.reason==='metadata_field_not_allowed'));
  const nested=candidate('nested-publication');
  nested.original_publication.substantive_support='Undercounted source support.';
  assert.equal(boundResearchCandidates([nested]).not_retained[0].reason,'candidate_publication_fields');
  const direct=validResearch();
  direct.retained_articles[0].substantive_support='Extra source support bypassing the retention function.';
  assert.ok(has(validateEditorialResearch(direct),'article_metadata_field_not_allowed'));
});

test('metadata allowlist preserves bounded exact identity/provenance fields while rejecting prose disguised as references',()=>{
  const original=candidate('bound-metadata',{
    title:'A bounded source title',item_id:'item-1',source_id:'publisher-1',source_url:'https://example.com/feed',
    publisher_id:'publisher-1',channel_id:'channel-1',show_id:'show-1',
    source_observation_ref:'docs/implementation/iteration-05/source-observations.json#route-1',
    source_observation_sha256:'a'.repeat(64)
  });
  const bounded=boundResearchCandidates([original]);
  assert.equal(bounded.retained_articles.length,1);
  assert.deepEqual(bounded.retained_articles[0],{...original,discovery_only:true});
  for(const invalid of [
    candidate('long-title',{title:'x'.repeat(301)}),
    candidate('reference-prose',{evidence_refs:['This field contains source evidence instead of a reference.']}),
    candidate('reference-large',{evidence_refs:['x'.repeat(513)]}),
    candidate('nested-id',{item_id:{support:'Source prose inside an identity field'}}),
    candidate('digest-array',{source_observation_ref:'proof:1',source_observation_sha256:['a'.repeat(64)]}),
    candidate('digest-missing',{source_observation_ref:'proof:1'})
  ]){
    assert.equal(boundResearchCandidates([invalid]).retained_articles.length,0,invalid.id);
  }
});

test('metadata deduplication reuses only the same type and URL without merging distinct query identities',()=>{
  const first=candidate('best',{score:100});
  const duplicate=candidate('duplicate',{url:first.url+'#section',score:1});
  const different=candidate('different',{url:first.url+'?version=2'});
  const video=candidate('video',{type:'video',url:first.url});
  const bounded=boundResearchCandidates([duplicate,different,video,first]);
  assert.deepEqual(new Set(bounded.retained_articles.map(c=>c.id)),new Set(['best','different']));
  assert.equal(bounded.media.video.length,1);
  assert.equal(bounded.not_retained.find(c=>c.id==='duplicate').reason,'duplicate_type_url');
});

test('I05-T05: a complete supported six-story research package passes the mechanical boundary',()=>{
  const research=validResearch(), before=structuredClone(research);
  assert.deepEqual(validateEditorialResearch(research),[]);
  assert.deepEqual(research,before);
});

test('qualification replay validates its envelope without selecting six stories or waiving editorial admission',()=>{
  const articles=Array.from({length:10},(_,n)=>candidate(`qualification-${n}`));
  const podcasts=Array.from({length:5},(_,n)=>candidate(`qualification-podcast-${n}`,{type:'podcast'}));
  const bounded=boundResearchCandidates([...articles,...podcasts]);
  const envelope={
    retained_articles:bounded.retained_articles,
    deep_packets:bounded.retained_articles.slice(0,9).map(packet),
    media:{video:[],podcast:{retained_candidates:bounded.media.podcast,evidence_packets:bounded.media.podcast.map(packet)}},
    limits:bounded.limits
  };
  const before=structuredClone(envelope);
  assert.deepEqual(validateResearchEnvelope(envelope),[],'current route samples can prove bounded acquisition with no edition selections');
  assert.ok(has(validateEditorialResearch(envelope),'article_selection_exactly_six'),'actual editorial admission retains its required selection gate');
  assert.ok(has(validateResearchEnvelope({...envelope,selected_ids:articles.slice(0,6).map(c=>c.id)}),'research_envelope_selection_not_allowed'));
  assert.ok(has(validateResearchEnvelope({...envelope,deep_packets:articles.map(packet)}),'article_evidence_packet_limit'));
  assert.ok(has(validateResearchEnvelope({...envelope,substantive_support:'Uncounted evidence'}),'research_field_not_allowed'));
  assert.deepEqual(envelope,before);
});

test('I05-T05: direct validation cannot bypass retained, deep-packet or configured envelope limits',()=>{
  const retained=validResearch();
  retained.retained_articles.push(...Array.from({length:15},(_,n)=>candidate(`extra-${n}`)));
  assert.ok(has(validateEditorialResearch(retained),'article_retention_limit'));
  const deep=validResearch();
  const additions=Array.from({length:4},(_,n)=>candidate(`deep-${n}`));
  deep.retained_articles.push(...additions);deep.deep_packets.push(...additions.map(packet));
  assert.ok(has(validateEditorialResearch(deep),'article_evidence_packet_limit'));
  for(const key of Object.keys(RESEARCH_LIMITS)){
    assert.throws(()=>boundResearchCandidates([],{limits:{[key]:RESEARCH_LIMITS[key]+1}}),/research_limits/);
    assert.ok(has(validateEditorialResearch({...validResearch(),limits:{[key]:RESEARCH_LIMITS[key]+1}}),'research_limits'));
  }
});

test('I05-T05: all serialized evidence fields consume the 12000-character cap',()=>{
  const research=validResearch();
  research.deep_packets[0].unreviewed_appendix='x'.repeat(12000);
  assert.ok(has(validateEditorialResearch(research),'article_evidence_character_limit'),'an extra key cannot smuggle a full source past evidence_text counting');
  delete research.deep_packets[0].unreviewed_appendix;
  const remaining=12000-researchEvidenceCharacters(research.deep_packets);
  research.deep_packets[0].evidence_text+='😀'.repeat(remaining);
  assert.equal(researchEvidenceCharacters(research.deep_packets),12000);
  assert.deepEqual(validateEditorialResearch(research),[],'the cap counts Unicode codepoints, not UTF-16 surrogate halves');
  research.deep_packets[0].evidence_text+='😀';
  assert.ok(has(validateEditorialResearch(research),'article_evidence_character_limit'));
});

test('lossy serializers, hidden properties and custom prototypes cannot evade evidence counting',()=>{
  const serializer=validResearch();
  serializer.deep_packets[0].toJSON=()=>({});
  assert.ok(has(validateEditorialResearch(serializer),'article_evidence_must_be_plain_json'));
  const hidden=validResearch();
  Object.defineProperty(hidden.deep_packets[0],'hidden_source',{value:'Secret extra context',enumerable:false});
  assert.ok(has(validateEditorialResearch(hidden),'article_evidence_must_be_plain_json'));
  const accessor=validResearch();
  Object.defineProperty(accessor.deep_packets[0],'hidden_source',{get(){throw new Error('Getter must never run');},enumerable:true});
  assert.ok(has(validateEditorialResearch(accessor),'article_evidence_must_be_plain_json'));
  const prototype=validResearch();
  Object.setPrototypeOf(prototype.deep_packets,{toJSON:()=>[]});
  assert.ok(has(validateEditorialResearch(prototype),'article_evidence_must_be_plain_json'));
});

test('uncounted support fields on research and media wrappers fail the closed boundary',()=>{
  const top=validResearch();top.substantive_support='Evidence outside the counted packet array.';
  assert.ok(has(validateEditorialResearch(top),'research_field_not_allowed'));
  const container=validResearch();container.media.substantive_support='Evidence hidden outside a media type.';
  assert.ok(has(validateEditorialResearch(container),'media_discovery_field_not_allowed'));
  const wrapper=validResearch();
  wrapper.media.video={retained_candidates:[],evidence_packets:[],substantive_support:'Uncounted wrapper evidence.'};
  assert.ok(has(validateEditorialResearch(wrapper),'video_discovery_field_not_allowed'));
  assert.deepEqual(validateEditorialResearch(null),['research_input_object']);
});

test('final six-story allocation requires distinct retained IDs, two per focus and exactly one Skill',()=>{
  const tooFew=validResearch();tooFew.selected_ids.pop();
  assert.ok(has(validateEditorialResearch(tooFew),'article_selection_exactly_six'));
  const duplicate=validResearch();duplicate.selected_ids[5]=duplicate.selected_ids[0];
  assert.ok(has(validateEditorialResearch(duplicate),'article_selection_exactly_six'));
  const missing=validResearch();missing.selected_ids[5]='unknown-item';
  assert.ok(has(validateEditorialResearch(missing),'article_selected_not_retained'));
  const imbalance=validResearch();imbalance.retained_articles[0].focus=RESEARCH_FOCUS[1];
  assert.ok(has(validateEditorialResearch(imbalance),'article_focus_allocation'));
  const noSkill=validResearch();for(const c of noSkill.retained_articles)c.agent_skills=false;
  assert.ok(has(validateEditorialResearch(noSkill),'article_exactly_one_agent_skills'));
  const twoSkills=validResearch();twoSkills.retained_articles[0].agent_skills=true;
  assert.ok(has(validateEditorialResearch(twoSkills),'article_exactly_one_agent_skills'));
});

test('every selected item needs its retained identity and a bound source-supported deep packet',()=>{
  const missing=validResearch();missing.deep_packets.pop();
  assert.ok(has(validateEditorialResearch(missing),'article_selected_missing_supported_evidence'));
  const unbound=validResearch();unbound.deep_packets[0].source_refs=['unrelated:evidence'];
  assert.ok(has(validateEditorialResearch(unbound),'article_evidence_source_binding'));
  assert.ok(has(validateEditorialResearch(unbound),'article_selected_missing_supported_evidence'));
  const unsupported=validResearch();unsupported.retained_articles[0].source_supported=false;
  assert.ok(has(validateEditorialResearch(unsupported),'article_selected_missing_supported_evidence'));
  const duplicate=validResearch();duplicate.deep_packets.push(structuredClone(duplicate.deep_packets[0]));
  assert.ok(has(validateEditorialResearch(duplicate),'article_evidence_duplicate'));
});

test('media retains and verifies bounded packets separately from article and other-media budgets',()=>{
  const research=validResearch();
  for(const type of ['video','podcast']){
    const retained_candidates=Array.from({length:6},(_,n)=>candidate(`${type}-${n}`,{type}));
    research.media[type]={retained_candidates,evidence_packets:retained_candidates.map(packet)};
  }
  assert.deepEqual(validateEditorialResearch(research),[],'six video plus six podcast packets do not consume six article deep packets');
  const overflow=structuredClone(research);
  overflow.media.video.retained_candidates.push(candidate('video-7',{type:'video'}));
  overflow.media.video.evidence_packets.push(packet(overflow.media.video.retained_candidates.at(-1)));
  assert.ok(has(validateEditorialResearch(overflow),'video_evidence_packet_limit'));
  assert.equal(has(validateEditorialResearch(overflow),'article_evidence_packet_limit'),false);
  assert.equal(has(validateEditorialResearch(overflow),'podcast_evidence_packet_limit'),false);
  const metadata=structuredClone(research);
  metadata.media.podcast.retained_candidates.push(...Array.from({length:7},(_,n)=>candidate(`p-extra${n}`,{type:'podcast'})));
  assert.ok(has(validateEditorialResearch(metadata),'podcast_retention_limit'));
});

test('each media type has its own full 6000-character evidence representation cap',()=>{
  const research=validResearch();
  for(const type of ['video','podcast']){
    const c=candidate(type,{type}), evidence_packets=[packet(c)];
    evidence_packets[0].evidence_text+='x'.repeat(6000-researchEvidenceCharacters(evidence_packets));
    research.media[type]={retained_candidates:[c],evidence_packets};
  }
  assert.deepEqual(validateEditorialResearch(research),[]);
  research.media.video.evidence_packets[0].evidence_text+='x';
  assert.ok(has(validateEditorialResearch(research),'video_evidence_character_limit'));
  assert.equal(has(validateEditorialResearch(research),'podcast_evidence_character_limit'),false);
});

test('I05-T06: a long talk and unknown-runtime video remain discovery leads; existing media gate refuses selection',()=>{
  const bounded=boundResearchCandidates([
    candidate('long-talk',{type:'video',duration_seconds:3600,verified:true,selection_ready:true}),
    candidate('unknown-runtime',{type:'video'})
  ]);
  assert.equal(bounded.media.video.length,2);
  const long=bounded.media.video.find(c=>c.id==='long-talk'), unknown=bounded.media.video.find(c=>c.id==='unknown-runtime');
  assert.equal(long.discovery_only,true);
  assert.equal(long.media_admission,'NOT_RUN');
  assert.equal(Object.hasOwn(long,'verified'),false);
  assert.equal(Object.hasOwn(long,'selection_ready'),false);
  assert.equal(unknown.duration_seconds,null);
  assert.throws(()=>mediaDurationBand('video',long.duration_seconds),/duration exceeds/);
  assert.throws(()=>mediaDurationBand('video',unknown.duration_seconds),/unknown runtime remains unresolved/);
});

test('short pool and tighter limits report coverage gaps without inventing candidates',()=>{
  const pool=[candidate('only-technical')];
  const bounded=boundResearchCandidates(pool);
  assert.equal(bounded.retained_articles.length,1);
  assert.equal(bounded.coverage_gaps.filter(gap=>gap.focus).length,3);
  assert.ok(bounded.coverage_gaps.some(gap=>gap.requirement==='agent_skills'));
  const none=boundResearchCandidates(pool,{limits:{retained_articles:0}});
  assert.equal(none.retained_articles.length,0);
  assert.equal(none.not_retained.length,1);
});
