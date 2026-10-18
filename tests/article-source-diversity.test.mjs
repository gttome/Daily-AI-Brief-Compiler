import test from 'node:test';
import assert from 'node:assert/strict';
import {articlePublisherKey,validateArticleSourceDiversity} from '../compiler/source-diversity.mjs';

const story=(url,publisher='Publisher display text')=>({source:{url,publisher}});
const b=(stories,edition_date='2026-10-19')=>({edition_date,stories});
const six=[
  story('https://aws.amazon.com/blogs/machine-learning/new-agent'),
  story('https://news.sap.com/2026/10/new-business-ai'),
  story('https://github.blog/changelog/2026-10-19-tool-controls'),
  story('https://research.google/blog/evaluation'),
  story('https://www.anthropic.com/news/reliability'),
  story('https://openai.com/index/safety-workflow')
];
test('six independently published stories pass the future editorial gate',()=>{
  const r=validateArticleSourceDiversity(b(six));
  assert.equal(r.result,'PASS');
  assert.equal(r.distinct_publishers,6);
  assert.equal(r.publisher_counts.aws,1);
  assert.equal(r.publisher_counts.sap,1);
});
test('AWS and SAP news subdomains and blog departments do not count as new publishers',()=>{
  assert.equal(articlePublisherKey({url:'https://aws.amazon.com/blogs/machine-learning/agent'}),'aws');
  assert.equal(articlePublisherKey({url:'https://aws.amazon.com/blogs/publicsector/agent'}),'aws');
  assert.equal(articlePublisherKey({url:'https://news.sap.com/en/ai'}),'sap');
  assert.equal(articlePublisherKey({url:'https://research.google/blog/a'}),'google');
  assert.equal(articlePublisherKey({url:'https://cloud.google.com/blog/b'}),'google');
  assert.equal(articlePublisherKey({url:'https://blog.google/ai/c'}),'google');
  assert.equal(articlePublisherKey({url:'https://github.blog/changelog/abc'}),'github');
  assert.equal(articlePublisherKey({url:'https://learn.microsoft.com/agent-framework'}),'microsoft');
});
test('even two AWS stories fail: changing blog department or publisher display name cannot bypass it',()=>{
  const stories=[...six];
  stories[1]=story('https://aws.amazon.com/blogs/publicsector/new-ai','Public Sector Partners');
  assert.throws(()=>validateArticleSourceDiversity(b(stories)),/ARTICLE_PUBLISHER_DIVERSITY_VIOLATION/);
});
test('even two SAP articles fail and three stories from one organization never pass',()=>{
  const stories=[...six];
  stories[0]=story('https://news.sap.com/2026/10/new-technical-ai','Independent editor');
  assert.throws(()=>validateArticleSourceDiversity(b(stories)),/ARTICLE_PUBLISHER_DIVERSITY_VIOLATION/);
  const three=[...six];
  three[1]=story('https://github.blog/ai-and-ml/a');
  three[3]=story('https://github.blog/changelog/b');
  assert.throws(()=>validateArticleSourceDiversity(b(three)),/ARTICLE_PUBLISHER_DIVERSITY_VIOLATION/);
});
test('five publishers are acceptable when two non-AWS/SAP stories are exceptionally newsworthy',()=>{
  const stories=[...six];
  stories[1]=story('https://cloud.google.com/blog/products/ai-machine-learning/agents');
  const r=validateArticleSourceDiversity(b(stories));
  assert.equal(r.distinct_publishers,5);
  assert.equal(r.publisher_counts.google,2);
});
test('four publishers cannot satisfy the mandatory diversity floor',()=>{
  const stories=[...six];
  stories[1]=story('https://cloud.google.com/blog/products/ai-machine-learning/agents');
  stories[4]=story('https://github.blog/ai-and-ml/other');
  assert.throws(()=>validateArticleSourceDiversity(b(stories)),/ARTICLE_PUBLISHER_DIVERSITY_VIOLATION/);
});
test('old published editions remain exempt and unknown future URLs fail closed',()=>{
  assert.equal(validateArticleSourceDiversity(b([], '2026-10-18')).result,'SKIPPED_HISTORICAL');
  const stories=[...six];stories[5]=story('not-a-real-source');
  assert.throws(()=>validateArticleSourceDiversity(b(stories)),/ARTICLE_SOURCE_IDENTITY_UNVERIFIED/);
});
