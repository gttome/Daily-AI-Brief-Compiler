#!/usr/bin/env node
// Exactly two October 29 published video replacements; all articles, podcasts,
// accepted PNGs, immutable image jobs, archive history and feedback IDs retained.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const DATE='2026-10-29';
const PRIMARY=['index.html','latest.html','latest.md','briefs/2026-10-29/index.html'];
const PERMANENT=['videos/2026-10-29/general/index.html','videos/2026-10-29/agent-skills/index.html'];
const ROUTES=[...PRIMARY,...PERMANENT,'feed.xml','feed.json','data/archive-index.json',
 'data/compiler-feedback-registry.json','briefs-archive/index.html'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=e=>{throw Error('OCT29_VIDEO_READER_REPAIR:'+e)};
const must=(ok,e)=>{if(!ok)fail(e)};
const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function replace(text,oldValue,newValue,label,min=1) {
 must(typeof oldValue==='string'&&oldValue&&typeof newValue==='string'&&newValue!==oldValue,'invalid_value_'+label);
 const count=text.split(oldValue).length-1;
 must(count>=min,'missing_exact_token_'+label+'_found_'+count);
 return text.split(oldValue).join(newValue);
}
function allFiles(root){
 const walk=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>{
  const rel=path.posix.join(prefix,d.name),target=path.join(dir,d.name);
  if(d.isDirectory())return walk(target,rel);
  must(d.isFile(),'nonfile_in_site:'+rel);
  return [rel];
 });
 return walk(root).sort();
}
function patchArticleBody(text,it,label){
 const a=it.old,b=it.new;
 for(const k of ['title','summary','why_it_matters','url'])text=replace(text,a[k],b[k],label+'_'+k);
 return text;
}
function patchOverview(route,content,rev){
 let text=content;
 for(const item of rev.slots){
  const o=item.old,n=item.new;
  text=patchArticleBody(text,item,route+'_'+item.slot);
  const oldHeading=route.endsWith('.md')?'### '+n.title:'<h3 id="'+slug(o.title)+'">'+n.title+'</h3>';
  const endFlag='<div class="story-feedback';
  const start=text.indexOf(oldHeading),end=text.indexOf(endFlag,start+oldHeading.length);
  must(start>=0&&end>start&&end-start<8500,'missing_or_oversized_video_panel_'+route+'_'+item.slot);
  let panel=text.slice(start,end);
  const md=route.endsWith('.md');
  if(md){
   panel=replace(panel,'**Channel:** '+o.source,'**Channel:** '+n.source,route+'_channel');
   panel=replace(panel,'**Date:** '+o.date_label,'**Date:** '+n.date_label,route+'_date');
   panel=replace(panel,'**Duration:** '+o.duration_with_qualifier,'**Duration:** '+n.duration+(n.duration_seconds>600?' · Substantive long-form editorial selection.':''),route+'_duration');
  }else{
   panel=replace(panel,'<strong>Channel:</strong> '+o.source,'<strong>Channel:</strong> '+n.source,route+'_channel');
   panel=replace(panel,'<strong>Date:</strong> '+o.date_label,'<strong>Date:</strong> '+n.date_label,route+'_date');
   panel=replace(panel,'<strong>Duration:</strong> '+o.duration_with_qualifier,'<strong>Duration:</strong> '+n.duration+(n.duration_seconds>600?' · Substantive long-form editorial selection.':''),route+'_duration');
   panel=replace(panel,'<h3 id="'+slug(o.title)+'">','<h3 id="'+slug(n.title)+'">',route+'_slug');
  }
  panel=replace(panel,'>Watch on '+o.source+'</a>','>Watch on '+n.source+'</a>',route+'_source_link_label');
  text=text.slice(0,start)+panel+text.slice(end);
  if(!md){
   const navigation='<a href="#'+(item.slot==='general'?'general':'agents-for-non-technical-people')+'">'+n.title+'</a><span>Video · '+o.duration+'</span>';
   const updated=navigation.replace('Video · '+o.duration,'Video · '+n.duration);
   text=replace(text,navigation,updated,route+'_navigation_duration');
  }
 }
 return text;
}
function patchPermanent(route,content,rev){
 const slot=route.includes('/general/')?'general':'agent-skills';
 const item=rev.slots.find(s=>s.slot===slot),o=item.old,n=item.new;
 let text=patchArticleBody(content,item,route);
 text=replace(text,'id="'+slug(o.title)+'"','id="'+slug(n.title)+'"',route+'_slug');
 text=replace(text,'<strong>Date:</strong> '+o.date_label,'<strong>Date:</strong> '+n.date_label,route+'_date');
 text=replace(text,'<strong>Duration:</strong> '+o.duration,'<strong>Duration:</strong> '+n.duration,route+'_duration');
 text=replace(text,'<span class="coverage-label">Evergreen instructional video</span>',
  '<span class="coverage-label">'+n.coverage_label+'</span>',route+'_coverage');
 text=replace(text,'<strong>Evidence:</strong> Practitioner Analysis',
  '<strong>Evidence:</strong> '+n.evidence_label,route+'_evidence');
 text=replace(text,'<strong>Availability:</strong> Not Applicable',
  '<strong>Availability:</strong> Publisher page, verified in protected signed-out playback check',route+'_availability');
 text=replace(text,'>'+o.source+'</a>','>'+n.source+'</a>',route+'_source');
 return text;
}
function patchFeedAtom(body,rev){
 const matched=[];
 let newBody=body.replace(/<entry\b[^>]*>[\s\S]*?<\/entry>/g,block=>{
  const selections=rev.slots.filter(it=>block.includes('<id>'+it.reader_id+'</id>'));
  if(selections.length===0)return block;
  must(selections.length===1,'overlapping_feed_entry');
  const item=selections[0];
  matched.push(item.slot);
  return replace(replace(block,item.old.title,item.new.title,'atom_title'),item.old.summary,item.new.summary,'atom_summary');
 });
 must(matched.length===2&&new Set(matched).size===2,'atom_two_entries');
 return newBody;
}
function matchingRow(rows,key,id){
 const m=rows.filter(x=>x[key]===id);
 must(m.length===1,'json_row_identity_'+id);
 return m[0];
}
function patchJson(route,body,rev){
 const data=JSON.parse(body),key=route==='feed.json'?'id':route==='data/archive-index.json'?'story_id':'canonical_reader_id';
 const collection=route==='data/archive-index.json'?'stories':'items';
 const before=new Map(data[collection].map(row=>[row[key],JSON.stringify(row)]));
 for(const it of rev.slots){
  const row=matchingRow(data[collection],key,it.reader_id);
  must((route==='data/archive-index.json'?row.headline:row.title)===it.old.title,'stale_json_title_'+route+'_'+it.slot);
  if(route==='feed.json'){
   row.title=it.new.title;row.summary=it.new.summary;row.tags=[it.new.source];
  }else if(route==='data/archive-index.json'){
   must(row.brief_date===DATE,'wrong_archive_date');
   row.headline=it.new.title;row.summary=it.new.summary;
   row.event_date=it.new.original_date;
   row.event_date_precision=it.new.date_precision;
   row.companies=[it.new.source];row.topics=it.new.topics;
   row.evidence_type='publisher_authored';row.availability_status='source_verified';
  }else row.title=it.new.title;
 }
 for(const row of data[collection]){
  if(!rev.slots.some(it=>it.reader_id===row[key]))
   must(before.get(row[key])===JSON.stringify(row),'unrelated_json_changed_'+route);
 }
 return JSON.stringify(data,null,2)+'\n';
}
function patchArchive(body,rev){
 const hits=[];
 const result=body.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g,segment=>{
  const selected=rev.slots.filter(it=>segment.includes('data-item-id="'+it.reader_id+'"'));
  if(selected.length===0)return segment;
  must(selected.length===1,'archive_card_overlap');
  const it=selected[0];hits.push(it.slot);
  return replace(replace(segment,it.old.title,it.new.title,'archive_title'),it.old.summary,it.new.summary,'archive_summary');
 });
 must(hits.length===2&&new Set(hits).size===2,'archive_two_cards');
 return result;
}
export function patchRoute(route,body,rev){
 if(PRIMARY.includes(route))return patchOverview(route,body,rev);
 if(PERMANENT.includes(route))return patchPermanent(route,body,rev);
 if(route==='feed.xml')return patchFeedAtom(body,rev);
 if(['feed.json','data/archive-index.json','data/compiler-feedback-registry.json'].includes(route))return patchJson(route,body,rev);
 if(route==='briefs-archive/index.html')return patchArchive(body,rev);
 fail('route_not_allowed:'+route);
}
function validate(rev,source){
 must(rev.schema_version==='daily-compiler-reading-copy-correction-v1'&&
  rev.correction_type==='OCT29_TWO_VIDEO_VALUE_MEDIA_ONLY'&&rev.edition_date===DATE&&
  rev.requested_by==='owner'&&rev.preserve_original===true&&rev.new_execution_allowed===false&&
  rev.protected_pr_required===true&&rev.no_image_generation===true,'revision_not_authorized');
 must(rev.slots?.length===2&&new Set(rev.slots.map(x=>x.slot)).size===2&&
  new Set(rev.slots.map(x=>x.new.source)).size===2,'source_diversity');
 must(new Set(rev.slots.map(x=>x.new.url)).size===2,'duplicate_candidate_urls');
 for(const it of rev.slots){
  must(it.reader_id==='dab-video-'+DATE+'-'+it.slot&&['general','agent-skills'].includes(it.slot),'video_slot');
  must(/^https:\/\//.test(it.new.url)&&it.old.url!==it.new.url,'source_url');
  must(it.new.duration_seconds>=180&&it.new.duration_seconds<=1200,'duration_range');
  must(it.new.summary.length>130&&it.new.why_it_matters.length>100,'substantive_copy');
 }
 const job=JSON.parse(fs.readFileSync(path.join(source,'image-jobs',DATE,'job.json'),'utf8'));
 must(job.source?.bundle_sha256===rev.original_bundle_sha256,'original_immutable_bundle_binding');
 const arch=JSON.parse(fs.readFileSync(path.join(source,'data/archive-index.json'),'utf8'));
 for(const it of rev.slots){
  must(!arch.stories.some(x=>x.brief_date<DATE&&
   (x.headline.toLowerCase()===it.new.title.toLowerCase()||x.story_id===it.reader_id)),'archive_repeat');
 }
}
export function stageOct29(revisionFile,source,out){
 const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
 must(fs.existsSync(source)&&!fs.existsSync(out),'source_or_destination_invalid');
 validate(rev,source);
 const files=allFiles(source),oldSHA=new Map(files.map(x=>[x,sha(fs.readFileSync(path.join(source,x)))]));
 must(ROUTES.every(x=>oldSHA.has(x)),'required_site_route_missing');
 fs.cpSync(source,out,{recursive:true});
 for(const route of ROUTES){
  const text=fs.readFileSync(path.join(source,route),'utf8');
  const changed=patchRoute(route,text,rev);
  must(changed!==text,'unchanged_target:'+route);
  fs.writeFileSync(path.join(out,route),changed);
 }
 must(JSON.stringify(files)===JSON.stringify(allFiles(out)),'site_inventory_changed');
 const changed=files.filter(x=>sha(fs.readFileSync(path.join(out,x)))!==oldSHA.get(x));
 must(JSON.stringify(changed.sort())===JSON.stringify([...ROUTES].sort()),'non_allowlisted_site_change');
 for(const f of files){
  if(f.startsWith('image-jobs/')||/\.(?:png|jpe?g|webp|gif|svg)$/i.test(f)||
     f.includes('2026-10-08'))
   must(sha(fs.readFileSync(path.join(out,f)))===oldSHA.get(f),'immutable_preservation_violation:'+f);
 }
 return {schema_version:'daily-compiler-oct29-two-video-editorial-correction-v1',
  result:'PASS',edition_date:DATE,files_changed:changed.length,
  changed:changed.map(route=>({route,previous_sha256:oldSHA.get(route),
   current_sha256:sha(fs.readFileSync(path.join(out,route)))})),
  source_publishers:rev.slots.map(x=>x.new.source),
  original_bundle_unchanged:true,unchanged_published_files:files.length-changed.length,
  accepted_image_and_job_bytes_unchanged:true,historical_edition_bytes_unchanged:true,
  original_feedback_identities_preserved:true,video_count:2,
  playback_evidence:'PROTECTED_PR_SIGNED_OUT_PLAYBACK_GATE_REQUIRED',
  new_paid_apis:0,new_schedules:0,image_generation_count:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [rev,original,patched,receipt]=process.argv.slice(2);
 if(!receipt)fail('usage: stage-oct29-video-value.mjs <revision> <site> <outsite> <receipt>');
 const result=stageOct29(rev,original,patched);
 fs.mkdirSync(path.dirname(receipt),{recursive:true});
 fs.writeFileSync(receipt,JSON.stringify(result,null,2)+'\n');
 console.log('OCT29_TWO_VIDEO_MEDIA_CORRECTION_STAGED',result.files_changed,result.source_publishers);
}
