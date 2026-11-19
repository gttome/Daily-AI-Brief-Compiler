// Local, read-only source discovery for seven earlier released image sets.
// Original publication, later revision candidates and rejected regions stay
// separate. No fetch, live verification, pixel review or similarity score.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const date=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){if(e.code==='ENOENT')return null;if(e instanceof SyntaxError)return {_parse_error:true};throw e;}};
const dirs=p=>fs.existsSync(p)?fs.readdirSync(p,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort():[];
const repo='https://github.com/gttome/Daily-AI-Brief-Compiler';

export function buildImageReferenceIndex({edition,root,sourceCommit}){
 if(!date(edition)||!/^[a-f0-9]{40}$/.test(sourceCommit||''))throw Error('image_reference_index:exact_edition_and_source_commit_required');
 const base=`${repo}/blob/${sourceCommit}`,sets=[],unverified=[];
 for(const d of dirs(path.join(root,'external-image-packages')).filter(d=>date(d)&&d<edition).sort().reverse()){
  const prefix=`external-image-packages/${d}`,manifest=read(path.join(root,prefix,'manifest.json')),
   aar=read(path.join(root,prefix,'reviews/after-action.json'));
  if(manifest?.edition_date!==d||aar?.edition_date!==d||aar.publication?.result!=='RELEASED_VERIFIED'||
     manifest.job_sha256!==aar.job_sha256||!hex(manifest.job_sha256)||
     !Array.isArray(manifest.images)||manifest.images.length!==6||
     !Array.isArray(aar.images)||aar.images.length!==6||
     new Set(manifest.images.map(i=>i?.story_id)).size!==6||
     manifest.images.some(i=>i?.accepted_locked!==true||!hex(i.sha256)||typeof i.path!=='string'||
      path.posix.normalize(i.path)!==i.path||!i.path.startsWith(prefix+'/images/')||
      !aar.images.some(a=>a.story_id===i.story_id&&a.sha256===i.sha256))){
    unverified.push(d);continue;
  }
  const styles=manifest.set_review?.editorial_diversity?.stories??[];
  const examples=manifest.images.map(image=>{
   const style=styles.find(s=>s.story_id===image.story_id&&s.sha256===image.sha256);
   return {story_id:image.story_id,sha256:image.sha256,path:image.path,asset_ref:`${base}/${image.path}`,
    reference_scope:'original_accepted_release',relationship:style?.visual_thesis??null,
    medium:style?.medium_treatment??null,viewpoint:style?.perspective??null,
    observed_distinctiveness:style?.observed_distinctiveness??null};
  });
  const rejected_regions=(aar.errors??[]).filter(e=>e.generation_rejection).map(e=>({
   ...e.generation_rejection,observed_issue:e.issue,recorded_correction:e.correction}));
  // A revision manifest alone does not establish live publication or art approval.
  // Expose candidates so the worker checks the actual current prior-day PNGs.
  const revision_candidates=[];
  for(const id of dirs(path.join(root,'external-image-revisions',d))){
   const revision=read(path.join(root,'external-image-revisions',d,id,'manifest.json'));
   if(revision?.edition_date!==d||!Array.isArray(revision.images))continue;
   for(const image of revision.images){
    if(!examples.some(i=>i.story_id===image.story_id&&i.sha256===image.old_sha256)||!hex(image.sha256)||
       typeof image.path!=='string'||path.posix.normalize(image.path)!==image.path||
       !image.path.startsWith(`external-image-revisions/${d}/${id}/images/`))continue;
    revision_candidates.push({story_id:image.story_id,revision_id:id,sha256:image.sha256,
     asset_ref:`${base}/${image.path}`,published_route:image.published_route??null,
     publication_status:'NOT_ESTABLISHED_BY_REVISION_MANIFEST'});
   }
  }
  sets.push({edition_date:d,original_release_ref:`${base}/${prefix}/reviews/after-action.json`,
   contact_sheet_ref:manifest.set_review?.editorial_diversity?.contact_sheet_path?
    `${base}/${manifest.set_review.editorial_diversity.contact_sheet_path}`:null,
   examples,rejected_regions,revision_candidates});
  if(sets.length===7)break;
 }
 return {schema_version:'image-editorial-reference-index-v1',target_edition:edition,source_commit:sourceCommit,
  source_commit_provenance:'caller_supplied_verify_indexed_files_at_this_commit',
  requested_prior_editions:7,available_prior_editions:sets.length,reference_editions:sets.map(s=>s.edition_date),
  sets,skipped_unverified_editions:unverified,pixel_inspection_performed:false,
  instruction:'Inspect actual reference PNGs and any current verified revisions before choosing the closest earlier image. Index metadata is neither visual similarity evidence nor live revision proof.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [edition,root,sourceCommit,output]=process.argv.slice(2);
 if(!output)throw Error('usage: build-image-reference-index.mjs <next-edition> <repository-root> <protected-main-sha> <new-index.json>');
 const index=buildImageReferenceIndex({edition,root,sourceCommit});fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(index,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:'REFERENCE_INDEX_WRITTEN',available_prior_editions:index.available_prior_editions,pixel_inspection_performed:false}));
}
