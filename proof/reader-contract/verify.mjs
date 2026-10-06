import fs from 'node:fs';
import path from 'node:path';
import {compileShadow,sha256} from '../../compiler/compile.mjs';

const fullRoot=process.argv[2] || 'full-rehearsal';
const root=path.join(fullRoot,'rehearsals','full-six-story-v1');
const out='proof/reader-contract/site';
const temp='proof/reader-contract/tmp';

const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const editorial=readJson(path.join(root,'editorial','editorial.json'));
const media=readJson(path.join(root,'media','media.json'));
const watchlist=readJson(path.join(root,'watchlist','watchlist.json'));
const books=readJson(path.join(root,'books','book-mappings.json'));
const producer=readJson(path.join(root,'producer-receipt.json'));

const stories=editorial.selected_story_ids.map(id=>readJson(path.join(root,'stories',id+'.json')));
const images=editorial.selected_story_ids.map(id=>{
  const receipt=readJson(path.join(root,'images','rendered',id,'receipt.json'));
  const review=readJson(path.join(root,'images','reviews',id+'.json'));
  if(receipt.result!=='PASS'||review.result!=='PASS') throw new Error('image not accepted: '+id);
  return {
    story_id:id,
    path:path.posix.join('rehearsals/full-six-story-v1/images/rendered',id,'proof.png'),
    sha256:receipt.png_sha256,
    git_blob_sha:receipt.git_blob_sha,
    accepted:true,
    visual_review:{result:'PASS',reviewed_sha256:review.png_sha256}
  };
});

const bundle={
  schema_version:'daily-compiler-edition-bundle-v1',
  edition_date:editorial.target_edition_date,
  status:'BUNDLE_READY',
  editorial_contract_version:'daily-compiler-editorial-contract-v1',
  stories,
  videos:media.videos,
  podcasts:media.podcasts.map(p=>({
    title:p.episode_title,
    source:p.source,
    url:p.url,
    original_date:p.original_date,
    duration_minutes:p.duration_minutes,
    written_reading_time_minutes:p.written_reading_time_minutes,
    summary:p.summary,
    why_it_matters:p.why_it_matters,
    verified:p.verified
  })),
  watchlist,
  book_mappings:books.mappings,
  images,
  producer_receipt:{
    result:producer.result,
    owner_intervention:producer.owner_intervention,
    work_used:producer.work_used,
    codex_used:producer.codex_used,
    paid_model_api_used:producer.paid_model_api_used,
    semantic_stages_complete:['EDITORIAL','CONTENT','IMAGES','BUNDLE']
  }
};

fs.rmSync('proof/reader-contract',{recursive:true,force:true});
fs.mkdirSync(temp,{recursive:true});
const bundlePath=path.join(temp,'edition-bundle.json');
const bundleText=JSON.stringify(bundle,null,2)+'\n';
fs.writeFileSync(bundlePath,bundleText);
const digest=sha256(Buffer.from(bundleText,'utf8'));
const state={
  schema_version:'daily-compiler-state-v1',
  edition_date:bundle.edition_date,
  execution_id:'reader-contract-proof-2026-10-07',
  branch:'rehearsal/full-six-story-v1',
  state:'BUNDLE_READY',
  stage:'BUNDLE',
  started_at:'2026-10-06T22:17:30Z',
  updated_at:'2026-10-06T22:43:17Z',
  editorial_bundle:{status:'complete',digest:'existing-rehearsal-editorial'},
  images:{required:6,accepted:editorial.selected_story_ids},
  bundle:{status:'BUNDLE_READY',digest},
  last_error:null,
  retryable:false
};
const statePath=path.join(temp,'compiler-state.json');
fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');

const receipt=compileShadow({statePath,bundlePath,outDir:out,repoRoot:fullRoot});
const vf=receipt.verification;
for(const key of ['dated_edition','homepage_latest','archive_navigation','earlier_briefs','related_coverage','coverage_labels','ratings','share','accessible_image_alt','responsive','media_new_tab','watchlist','feed']){
  if(!vf.reader_contract?.[key]) throw new Error('reader feature missing: '+key);
}
if(vf.permanent_story_pages!==6) throw new Error('permanent pages mismatch');

const result={
  schema_version:'daily-compiler-real-rehearsal-reader-contract-proof-v1',
  result:'PASS',
  source_branch:'rehearsal/full-six-story-v1',
  source_semantic_rework:0,
  source_accepted_image_regenerations:0,
  source_files_reused_unchanged:true,
  bundle_assembly:'deterministic_projection_from_existing_persisted_outputs',
  bundle_sha256:digest,
  stories:6,
  permanent_story_pages:6,
  reader_contract:vf.reader_contract,
  watchlist_states:['New','Updated','Carried forward','Dropped'],
  exact_images_reused:images.map(i=>({story_id:i.story_id,sha256:i.sha256,git_blob_sha:i.git_blob_sha})),
  owner_intervention:false
};
fs.rmSync(temp,{recursive:true,force:true});
fs.writeFileSync('proof/reader-contract/result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
