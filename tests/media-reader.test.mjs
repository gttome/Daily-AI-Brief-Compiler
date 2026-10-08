import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {adaptCompilerBundle,mediaDurationLabel,mediaDurationSeconds} from '../compiler/reader-adapter.mjs';
import {mediaRendererEdition,projectMediaReaderFiles} from '../compiler/reader-materializer.mjs';
import {generatedFiles} from '../vendor/production-reader/snapshot/_generator/lib/render.mjs';
import {makeMediaBundle} from './fixtures/media.mjs';

const historicalPath=new URL('../fixtures/complete-edition/edition-bundle.json',import.meta.url);
const historicalBytes=fs.readFileSync(historicalPath);

function currentFixture(){
  const bundle=makeMediaBundle();
  // This is an isolated synthetic renderer fixture, outside the imported
  // October 6 frozen book/reading catalogs. It is never an edition execution.
  const before=bundle.edition_date;
  bundle.edition_date='2026-10-09';
  for(const story of bundle.stories)story.permanent_route=story.permanent_route.replace(before,bundle.edition_date);
  return bundle;
}

function renderFixture(bundle,t){
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-media-reader-'));
  t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
  fs.mkdirSync(path.join(repo,'briefs'));
  fs.writeFileSync(path.join(repo,'README.md'),'# Synthetic reader fixture\n\n## Archive\n');
  const adapted=adaptCompilerBundle(bundle);
  const renderInput=mediaRendererEdition(adapted.edition);
  const generated=generatedFiles(renderInput,repo,{watchlist:adapted.watchlist});
  return {adapted,generated,files:projectMediaReaderFiles(generated,bundle,adapted.edition)};
}

function rows(bundle,edition){
  return [
    ...bundle.videos.map((item,index)=>({item,id:`dab-video-${bundle.edition_date}-${index?'agent-skills':'general'}`,route:`videos/${bundle.edition_date}/${index?'agent-skills':'general'}.md`})),
    ...bundle.podcasts.map((item,index)=>({item,id:edition.podcasts[index].item_id,route:edition.podcasts[index].permanent_url.slice(1).replace(/\/$/,'.md')}))
  ];
}

test('I03-T06 canonical media adaptation preserves independent reader copy and original evidence',()=>{
  const bundle=currentFixture(),before=JSON.stringify(bundle);
  bundle.videos[0].duration_seconds=601;
  const input=JSON.stringify(bundle),adapted=adaptCompilerBundle(bundle);
  const video=adapted.edition.worth_watching.general;
  assert.equal(video.summary,bundle.videos[0].summary);
  assert.equal(video.why_it_matters,bundle.videos[0].why_it_matters);
  assert.equal(video.connection,bundle.videos[0].connection_to_brief);
  assert.equal(video.connection_to_brief,bundle.videos[0].connection_to_brief);
  assert.equal(video.runtime_seconds,601);
  assert.deepEqual(video.publication,bundle.videos[0].publication);
  assert.equal(video.research_cutoff_at,bundle.videos[0].research_cutoff_at);
  assert.equal(video.source_id,bundle.videos[0].source_id);
  assert.equal(video.selected_item_id,bundle.videos[0].item_id);
  assert.equal(JSON.stringify(bundle),input);
  const saved=JSON.stringify(adapted.edition);
  const renderInput=mediaRendererEdition(adapted.edition);
  assert.equal(renderInput.worth_watching.general.connection,bundle.videos[0].why_it_matters);
  assert.equal(JSON.stringify(adapted.edition),saved,'renderer alias must never mutate the canonical record');
  assert.notEqual(before,input,'the seconds assertion uses a changed synthetic runtime');
});

test('I03-T06 distinct copy, exact Duration and safe links reach home, latest, edition and permanent media pages',t=>{
  const bundle=currentFixture();
  bundle.videos[0].duration_seconds=601;
  const {files,adapted}=renderFixture(bundle,t);
  const collection=['index.md','latest.md',`briefs/${bundle.edition_date}.md`];
  for(const row of rows(bundle,adapted.edition)){
    for(const name of [...collection,row.route]){
      const output=files.get(name);
      for(const [label,value] of [['Summary',row.item.summary],['Why it matters',row.item.why_it_matters],['Connection to the Brief',row.item.connection_to_brief]])assert.ok(output.includes(`**${label}:** ${value}`),`${label} on ${name}`);
      assert.ok(output.includes(`**Duration:** ${mediaDurationLabel(row.item.duration_seconds)}`));
      assert.ok(output.includes(`**Date:** ${row.item.publication.original_value}`));
      assert.ok(output.includes(`href="${row.item.url.replaceAll('&','&amp;')}"`));
      const source=output.match(new RegExp(`<a href="${row.item.url.replaceAll('&','&amp;').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>`));
      assert.ok(source?.[0].includes('target="_blank"'));
      assert.ok(source?.[0].includes('rel="noopener noreferrer"'));
      if(bundle.podcasts.includes(row.item))assert.ok(output.includes(`**Written page:** ${row.item.written_reading_time_minutes} min read`));
    }
    const permanent=files.get(row.route);
    assert.equal((permanent.match(/\*\*Duration:\*\*/g)||[]).length,1);
    assert.doesNotMatch(permanent,/Runtime:|No episode time limit|Longer selection today|^### [^\n]+ · \d+:\d+/m);
  }
  assert.ok(files.get('index.md').includes('**Duration:** 10:01'));
});

test('I03-T06 item JSON/Atom feeds and archive records carry all three reader functions',t=>{
  const bundle=currentFixture(),{files,adapted}=renderFixture(bundle,t);
  const feed=JSON.parse(files.get('feed.json')),archive=JSON.parse(files.get('data/archive-index.json'));
  for(const row of rows(bundle,adapted.edition)){
    const item=feed.items.find(item=>item.id===row.id);
    assert.equal(item.summary,row.item.summary);
    assert.equal(item.external_url,row.item.url);
    assert.equal(item._daily_compiler_media.why_it_matters,row.item.why_it_matters);
    assert.equal(item._daily_compiler_media.connection_to_brief,row.item.connection_to_brief);
    assert.equal(item._daily_compiler_media.duration_seconds,row.item.duration_seconds);
    assert.deepEqual(item._daily_compiler_media.publication,row.item.publication);
    assert.equal(item._daily_compiler_media.research_cutoff_at,row.item.research_cutoff_at);
    for(const label of ['Summary','Why it matters','Connection to the Brief'])assert.ok(item.content_html.includes(`<strong>${label}:</strong>`));
    const archived=archive.stories.find(item=>item.story_id===row.id);
    assert.equal(archived.why_it_matters,row.item.why_it_matters);
    assert.equal(archived.connection_to_brief,row.item.connection_to_brief);
    const entry=[...files.get('feed.xml').matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(match=>match[0]).find(entry=>entry.includes(`<id>${row.id}</id>`));
    assert.ok(entry.includes('<content type="html">'));
    for(const value of [row.item.summary,row.item.why_it_matters,row.item.connection_to_brief])assert.ok(entry.includes(value));
    assert.ok(entry.includes('target=&quot;_blank&quot;'));
    assert.ok(entry.includes('rel=&quot;noopener noreferrer&quot;'));
  }
});

test('I03-T05 reader preserves date precision and never invents a zero or one-second unknown runtime',t=>{
  const bundle=currentFixture();
  bundle.videos[0].publication={original_value:'2026-10-07',precision:'date',timezone:'America/Chicago'};
  bundle.podcasts[0].duration_seconds=null;
  const {adapted,files}=renderFixture(bundle,t);
  assert.equal(adapted.edition.worth_watching.general.upload_date,'2026-10-07');
  assert.deepEqual(adapted.edition.worth_watching.general.publication,bundle.videos[0].publication);
  assert.equal(adapted.edition.podcasts[0].runtime_seconds,null);
  const podcast=rows(bundle,adapted.edition)[2];
  assert.ok(files.get(podcast.route).includes('**Duration:** Not independently verified'));
  assert.doesNotMatch(files.get(podcast.route),/\*\*Duration:\*\* (?:0:00|0:01)/);
  assert.ok(files.get('index.md').includes('**Date:** 2026-10-07  \n'));
  assert.equal(mediaDurationSeconds({duration_seconds:NaN},bundle),null);
  assert.equal(mediaDurationLabel(3601),'1:00:01');
});

test('I03-T08 historical v1 compatibility never fabricates Connection and keeps input/history bytes',t=>{
  const original=JSON.parse(historicalBytes),bundle=structuredClone(original);
  const before=bundle.edition_date;
  bundle.edition_date='2026-10-09';
  for(const story of bundle.stories)story.permanent_route=story.permanent_route.replace(before,bundle.edition_date);
  const {adapted,generated}=renderFixture(bundle,t);
  for(const slot of [...Object.values(adapted.edition.worth_watching),...adapted.edition.podcasts]){
    assert.equal(slot.connection_to_brief,null);
    assert.equal(slot.connection,'');
  }
  const historyName='videos/2026-10-06/retained-history.md',history='Retained historical media page\nExact saved bytes.\n';
  generated.set(historyName,history);
  const projected=projectMediaReaderFiles(generated,bundle,adapted.edition);
  assert.equal(projected.get(historyName),history);
  for(const row of rows(bundle,adapted.edition)){
    assert.ok(projected.get(row.route).includes(`**Why it matters:** ${row.item.why_it_matters}`));
    assert.doesNotMatch(projected.get(row.route),/\*\*Connection to the [Bb]rief:/);
  }
  assert.deepEqual(fs.readFileSync(historicalPath),historicalBytes);
  assert.deepEqual(JSON.parse(historicalBytes),original);
});

test('media projection fails visibly if a required current reader hook is missing',t=>{
  const bundle=currentFixture(),{adapted,generated}=renderFixture(bundle,t);
  const broken=new Map(generated);
  broken.delete(`videos/${bundle.edition_date}/general.md`);
  assert.throws(()=>projectMediaReaderFiles(broken,bundle,adapted.edition),/permanent media reader surface missing/);
  const brokenCopy=new Map(generated);
  brokenCopy.set('index.md',brokenCopy.get('index.md').replace(`**Why it matters:** ${bundle.videos[0].why_it_matters}`,'Lost reader field'));
  assert.throws(()=>projectMediaReaderFiles(brokenCopy,bundle,adapted.edition),/media reader copy hook changed/);
});
