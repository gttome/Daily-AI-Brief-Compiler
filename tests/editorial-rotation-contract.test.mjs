import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const text=file=>fs.readFileSync(file,'utf8');
const config=JSON.parse(text('contracts/editorial-contract.json'));
const sources=JSON.parse(text('config/resource-registry.json'));

test('prospective publisher and podcast limits are declared without changing six-story allocation',()=>{
  assert.equal(config.articles.count,6);
  assert.deepEqual(Object.values(config.articles.focus_allocation),[2,2,2]);
  assert.equal(config.articles.agent_skills_exactly,1);
  assert.equal(config.articles.source_diversity.effective_edition_date,'2026-10-19');
  assert.equal(config.articles.source_diversity.minimum_distinct_publishing_organizations,5);
  assert.equal(config.articles.source_diversity.aws_articles_maximum,1);
  assert.equal(config.articles.source_diversity.sap_articles_maximum,1);
  assert.equal(config.media.podcasts.count,2);
  assert.equal(config.media.podcasts.show_rotation.hard_no_repeat_in_previous_published_editions,3);
  assert.equal(config.media.podcasts.show_rotation.preferred_no_repeat_in_previous_published_editions,7);
  assert.equal(config.media.podcasts.show_rotation.exact_episode_repeat_lookback,7);
});
test('active editorial producer and both existing publishing gates invoke the new protections',()=>{
  assert.match(text('compiler/pending-editorial.mjs'),/validateArticleSourceDiversity\(bundle\)/);
  assert.match(text('scripts/verify-media-freshness.mjs'),/validateArticleSourceDiversity\(bundle\)/);
  for(const file of ['.github/workflows/bundle-ready-signal.yml','.github/workflows/shadow-compile.yml']){
    assert.match(text(file),/node scripts\/verify-media-freshness\.mjs/);
  }
  assert.match(text('docs/SEMANTIC-PRODUCER-CONTRACT.md'),/three-previous-published-edition/);
  assert.match(text('docs/EDITORIAL-CONTRACT.md'),/October 19, 2026 onward/);
  assert.match(text('docs/automation/TWO_TASK_DAILY_RUNBOOK.md'),/Source and show diversity/);
});
test('the verified research pool has genuinely widened across independent podcast shows',()=>{
  const pods=sources.resources.filter(x=>x.enabled&&x.content_types.includes('podcast'));
  const articles=sources.resources.filter(x=>x.enabled&&x.content_types.includes('article'));
  assert.ok(pods.length>=15,'at least fifteen discovery sources for two daily rotating programs');
  assert.ok(articles.length>=30,'article sources retain broad coverage');
  const ids=new Set(pods.map(x=>x.resource_id));
  for(const id of ['podcast-cognitive-revolution','podcast-no-priors','podcast-data-exchange',
    'podcast-ai-inside','podcast-eye-on-ai','podcast-gradient-dissent']){
    assert.ok(ids.has(id),id);
  }
  assert.ok(pods.every(x=>x.health.status==='unknown'),
    'new discovery sources must never claim episode verification without research');
});
