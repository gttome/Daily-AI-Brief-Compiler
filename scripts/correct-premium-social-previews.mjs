#!/usr/bin/env node
// Once-only six-page social metadata correction for the already illustrated Oct 16 edition.
// No regenerated images, semantic compilation, changes to article bodies, or arbitrary routes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {patchPremiumStoryPreview} from '../compiler/premium-social-preview.mjs';
import {bindAlreadyReleasedJob} from './verify-external-image-postrelease.mjs';
import {verifyNoOtherChanges} from './prepare-external-image-replacement.mjs';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const fail=s=>{throw Error('premium_social_preview_correction:'+s);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function correctPremiumSocialPreviews({revision,jobBytes,index,release,manifest,historyRoot,outputRoot}){
  if(revision?.schema_version!=='daily-compiler-premium-social-preview-correction-v1'||
     revision?.requested_by!=='owner'||revision?.correction_type!=='PREMIUM_SOCIAL_PREVIEW_ONLY'||
     revision?.edition_date!=='2026-10-16'||revision?.expected_image_count!==6||
     !/^[a-f0-9]{40}$/.test(revision?.expected_history_head||''))
    fail('unapproved_revision_scope');
  const binding=bindAlreadyReleasedJob({jobBytes,index,release,manifest});
  if(binding.date!==revision.edition_date||binding.stories.length!==6)fail('source_release_binding_failed');
  const source=path.resolve(historyRoot),output=path.resolve(outputRoot);
  if(!fs.existsSync(source)||fs.existsSync(output)||output===source||
      output.startsWith(source+path.sep)||source.startsWith(output+path.sep))
    fail('unsafe_history_or_existing_output');
  const changes=[],seen=new Set();
  // Qualify the complete approved set and its exact published PNGs before copying.
  for(const story of binding.stories){
    const route=story.permanent_url.startsWith(BASE)?story.permanent_url.slice(BASE.length):'';
    if(!new RegExp('^stories/'+binding.date+'/[a-z0-9-]+/$').test(route)||seen.has(route))
      fail('invalid_or_duplicate_story_route');
    seen.add(route);
    const imagePath=story.image_url.startsWith(BASE)?new URL(story.image_url).pathname.replace(/^\/Daily-AI-Brief-Compiler\//,''):'';
    if(imagePath!=='briefs/images/'+binding.date+'/'+path.posix.basename(imagePath))
      fail('untrusted_image_path');
    const imageBytes=fs.readFileSync(path.join(source,imagePath));
    if(imageBytes.length!==story.image_bytes||sha(imageBytes)!==story.image_sha256)
      fail('accepted_premium_bytes_drift:'+story.story_id);
    const page=route+'index.html';
    const before=fs.readFileSync(path.join(source,page),'utf8');
    const updated=patchPremiumStoryPreview(before,{
      permanentUrl:story.permanent_url,imageUrl:story.image_url,imageAlt:story.image_alt_text
    });
    changes.push({route:page,story_id:story.story_id,original_sha256:sha(Buffer.from(before)),
      current_sha256:sha(Buffer.from(updated.html)),fields_changed:updated.fields_changed,
      image_sha256:story.image_sha256,updated_html:updated.html});
  }
  if(changes.length!==6||changes.some(x=>x.fields_changed!==3))fail('six_times_three_fields_required');
  fs.cpSync(source,output,{recursive:true});
  for(const c of changes)fs.writeFileSync(path.join(output,c.route),c.updated_html,'utf8');
  const otherFilesPreserved=verifyNoOtherChanges(source,output,new Set(changes.map(x=>x.route)));
  return {schema_version:'daily-compiler-premium-social-preview-correction-receipt-v1',
    result:'PASS',edition_date:binding.date,changed:changes.map(({updated_html,...rest})=>rest),
    html_pages_changed:6,preview_fields_changed:18,accepted_images_preserved:6,
    other_files_byte_preserved:otherFilesPreserved,
    editorial_and_watchlist_preserved:true,accepted_image_regenerations:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [revisionFile,jobFile,indexFile,releaseFile,manifestFile,historyRoot,outputRoot,receiptFile]=process.argv.slice(2);
  if(!receiptFile)fail('usage: node scripts/correct-premium-social-previews.mjs <revision> <job> <index> <release> <manifest> <history-site> <output-site> <receipt>');
  const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const receipt=correctPremiumSocialPreviews({revision:readJson(revisionFile),
    jobBytes:fs.readFileSync(jobFile),index:readJson(indexFile),release:readJson(releaseFile),
    manifest:readJson(manifestFile),historyRoot,outputRoot});
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({result:receipt.result,files:receipt.html_pages_changed,fields:receipt.preview_fields_changed}));
}
