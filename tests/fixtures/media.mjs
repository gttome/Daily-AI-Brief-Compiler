// Synthetic contract inputs only. These records are not editorial selections or live proof.
import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_CONTRACT_VERSION, MEDIA_RECORD_VERSION, MEDIA_EVIDENCE_VERSION, mediaCopySha256, mediaStoryContextSha256, mediaReviewedEvidenceSha256, mediaSha256, evaluateMediaFreshness, mediaDurationBand } from '../../compiler/media.mjs';

export function makeMediaBundle() {
  const bundle = JSON.parse(fs.readFileSync(new URL('../../fixtures/complete-edition/edition-bundle.json', import.meta.url), 'utf8'));
  bundle.schema_version = 'daily-compiler-edition-bundle-v2';
  bundle.editorial_contract_version = 'daily-compiler-editorial-contract-v2';
  bundle.media_contract_version = MEDIA_CONTRACT_VERSION;
  bundle.edition_date = '2026-10-09';
  bundle.research_cutoff_at = '2026-10-08T00:00:00Z';
  for (const story of bundle.stories) story.permanent_route = story.permanent_route.replace('2026-10-06', bundle.edition_date);
  bundle.videos = [makeItem(bundle, 'video', 1), makeItem(bundle, 'video', 2)];
  bundle.podcasts = [makeItem(bundle, 'podcast', 1), makeItem(bundle, 'podcast', 2)];
  bundle.media_evidence = {path:'fixtures/media/evidence.json',sha256:'0'.repeat(64)};
  return bundle;
}

function makeItem(bundle, type, n) {
  const video = type === 'video', id = `${type}-${n}`;
  const item = {
    schema_version:MEDIA_RECORD_VERSION, type, id,
    item_id:video ? `FixtureVid${n}` : `episode-${n}`,
    source_id:video ? 'UC' + String(n).repeat(22) : `show-${n}-canonical-guid`,
    source:video ? `Synthetic Channel ${n}` : `Synthetic Podcast ${n}`,
    source_url:video ? `https://www.youtube.com/channel/UC${String(n).repeat(22)}` : `https://podcast${n}.example/show`,
    url:video ? `https://www.youtube.com/watch?v=FixtureVid${n}` : `https://podcast${n}.example/episodes/episode-${n}`,
    title:video ? `Synthetic evidence workflow demonstration ${n}` : `Synthetic professional review discussion ${n}`,
    publication:{original_value:'2026-10-07T12:00:00Z',precision:'second',timezone:'UTC'},
    research_cutoff_at:bundle.research_cutoff_at,
    duration_seconds:video ? 600 : 3600,
    freshness_band:video ? 'within_72h' : 'preferred_48h',
    duration_band:video ? 'preferred_10m' : 'no_ceiling',
    freshness_fallback_reason:null, duration_fallback_reason:null,
    summary:`The synthetic ${type} ${n} demonstrates how evidence is attached to a work product before review and release.`,
    why_it_matters:`Professionals can use the review criteria in synthetic ${type} ${n} to reduce unsupported claims in client deliverables.`,
    connection_to_brief:`Synthetic ${type} ${n} expands the selected evidence-workflow story with a worked example of its verification boundary.`,
    related_story_ids:[bundle.stories[n-1].id],
    metadata_ref:`${id}-metadata`, support_refs:[`${id}-support`], reader_review_ref:`${id}-review`
  };
  if (video) item.focus = n === 1 ? 'Technical AI Engineering' : 'Agents for Everyone';
  else item.written_reading_time_minutes = 2;
  return item;
}

export function refreshMediaBands(bundle) {
  for (const item of [...bundle.videos, ...bundle.podcasts]) {
    item.freshness_band = evaluateMediaFreshness(item.type, item.publication, bundle.research_cutoff_at).band;
    item.duration_band = mediaDurationBand(item.type, item.duration_seconds);
  }
  return bundle;
}

export function makeMediaEvidence(bundle) {
  const records = [];
  for (const item of [...bundle.videos, ...bundle.podcasts]) {
    const binding = Object.fromEntries(['type','item_id','source_id','url','source_url'].map(key => [key,item[key]]));
    const observed = {...binding,authority:item.type === 'video' ? 'official_channel' : 'publisher',evidence_url:item.url,retrieved_at:'2026-10-08T00:01:00Z'};
    records.push({
      ...observed,id:item.metadata_ref,kind:'metadata',publication:structuredClone(item.publication),
      duration:{original_value:String(item.duration_seconds),format:'seconds',seconds:item.duration_seconds},
      original_metadata:Object.fromEntries(['type','item_id','source_id','url','source_url','title','source'].map(key => [key,item[key]]))
    });
    records.push({
      ...observed,id:item.support_refs[0],kind:'content_support',
      source_excerpt:'SYNTHETIC TEST ONLY: The demonstration assembles evidence, compares it with review criteria, and returns failed work for correction before releasing a verified result.',
      supports:{
        summary:'The observed synthetic demonstration explicitly covers evidence assembly, review and release.',
        why_it_matters:'The example explains how review criteria can identify unsupported claims before a professional delivers the work.',
        connection_to_brief:'The mechanism corresponds to the selected evidence workflow story and illustrates its verification boundary.'
      }
    });
    records.push({
      ...binding,id:item.reader_review_ref,kind:'reader_value_review',scope:'existing_content_pass',result:'PASS',reviewed_at:'2026-10-08T00:02:00Z',
      reviewed_copy_sha256:mediaCopySha256(item),selected_story_context_sha256:mediaStoryContextSha256(bundle.stories),reviewed_evidence_sha256:mediaReviewedEvidenceSha256(item,records),support_refs:[...item.support_refs],
      checks:{summary_describes_content:true,why_explains_professional_value:true,connection_identifies_selected_coverage:true,semantically_distinct:true},
      rationale:{
        summary:'Describes the demonstrated assembly, review and release sequence shown in the source.',
        why_it_matters:'Explains the professional benefit of detecting unsupported claims before client delivery.',
        connection_to_brief:'Names the relation to the selected verification story and adds a worked boundary example.'
      }
    });
  }
  return {schema_version:MEDIA_EVIDENCE_VERSION,edition_date:bundle.edition_date,research_cutoff_at:bundle.research_cutoff_at,records};
}
export function makeMediaFixture() {
  const bundle = makeMediaBundle();
  const state = JSON.parse(fs.readFileSync(new URL('../../fixtures/complete-edition/compiler-state.json',import.meta.url),'utf8'));
  state.edition_date = bundle.edition_date;
  state.execution_id = 'synthetic-iteration-03-media';
  state.branch = 'shadow/' + bundle.edition_date;
  state.research_cutoff_at = bundle.research_cutoff_at;
  return {bundle,state,evidence:makeMediaEvidence(bundle)};
}
export function writeMediaFixture(root, fixture = makeMediaFixture()) {
  const evidenceBytes = JSON.stringify(fixture.evidence,null,2)+'\n';
  const evidencePath = path.join(root, fixture.bundle.media_evidence.path);
  fs.mkdirSync(path.dirname(evidencePath),{recursive:true});
  fs.writeFileSync(evidencePath,evidenceBytes);
  fixture.bundle.media_evidence.sha256 = mediaSha256(evidenceBytes);
  const bundlePath = path.join(root,'edition-bundle.json');
  fs.writeFileSync(bundlePath,JSON.stringify(fixture.bundle,null,2)+'\n');
  fixture.state.bundle.digest = mediaSha256(fs.readFileSync(bundlePath));
  const statePath = path.join(root,'compiler-state.json');
  fs.writeFileSync(statePath,JSON.stringify(fixture.state,null,2)+'\n');
  return {...fixture,statePath,bundlePath,repoRoot:root};
}
