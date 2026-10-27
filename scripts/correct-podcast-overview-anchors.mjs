#!/usr/bin/env node
// Repair only missing podcast Overview fragment targets on historically published
// daily pages. No editorial reseal, image regeneration, or changes to other links.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=(root,route)=>fs.readFileSync(path.join(root,route));
const fail=why=>{throw Error('podcast_overview_anchor_correction:'+why);};
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
const OVERVIEW=/<section class="edition-overview"[^>]*>[\s\S]*?<\/section>/;
function inventory(root,relative=''){
  const result=[];
  for(const e of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
    const route=path.posix.join(relative,e.name);
    if(e.isDirectory())result.push(...inventory(root,route));
    else if(e.isFile())result.push(route);
    else fail('unexpected_special_file:'+route);
  }
  return result.sort();
}
export function overviewTargets(html){
  const block=String(html).match(OVERVIEW)?.[0];
  return block?[...block.matchAll(/<a href="#([^"]+)"/g)].map(m=>m[1]):[];
}
export function repairPodcastOverviewContent(text,route){
  const markdown=route.endsWith('.md');
  const references=overviewTargets(text);
  const targets=references.filter(id=>/^podcast-dab-podcast-[a-z0-9-]+$/.test(id));
  if(targets.length===0)return {text,links_fixed:0,targets:0,skipped:true};
  if(targets.length!==2||new Set(references).size!==references.length)
    fail('unexpected_overview_podcast_link_count:'+route);
  let result=text,linksFixed=0;
  for(const id of targets){
    const anchor='id="'+id+'"';
    const count=result.split(anchor).length-1;
    if(count===1)continue;
    if(count!==0)fail('duplicate_target_anchor:'+route+':'+id);
    const podcastId=id.slice('podcast-'.length);
    const marker='data-podcast-id="'+podcastId+'"';
    const pos=result.indexOf(marker);
    if(pos<0||result.indexOf(marker,pos+marker.length)>=0)
      fail('unique_podcast_metadata_missing:'+route+':'+podcastId);
    const headingStart=markdown?result.lastIndexOf('\n### ',pos):result.lastIndexOf('<h3 ',pos);
    const start=markdown?headingStart+1:headingStart;
    if(headingStart<0||pos-start>3000)
      fail('podcast_heading_cannot_be_located:'+route+':'+id);
    const heading=result.slice(start,start+280);
    if(markdown?!/^### (?:9|10)\. /.test(heading):!/^<h3\b[^>]*>(?:9|10)\. /.test(heading))
      fail('wrong_podcast_heading:'+route+':'+id);
    const injection='<span id="'+id+'"></span>\n'+(markdown?'\n':'');
    result=result.slice(0,start)+injection+result.slice(start);
    linksFixed++;
    const targetPos=result.indexOf(anchor);
    const metadataPos=result.indexOf(marker,targetPos);
    if(metadataPos<=targetPos||metadataPos-targetPos>3000)
      fail('new_anchor_not_bound_to_podcast:'+route+':'+id);
  }
  for(const id of targets){
    if(result.split('id="'+id+'"').length!==2)
      fail('missing_or_duplicate_podcast_target_after_fix:'+route+':'+id);
  }
  if(!markdown){
    for(const id of references){
      if(result.split('id="'+id+'"').length!==2)
        fail('broken_or_duplicate_toc_link_after_fix:'+route+':'+id);
    }
  }
  return {text:result,links_fixed:linksFixed,targets:targets.length,skipped:false};
}
export function correctPodcastOverviewAnchors({revisionFile,historySite,outSite}){
  const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
  if(rev.schema_version!=='daily-compiler-reading-copy-correction-v1'||
     rev.correction_type!=='PODCAST_OVERVIEW_ANCHORS_ONLY'||
     rev.scope!=='EXISTING_READER_PODCAST_NAVIGATION_ONLY'||
     rev.requested_by!=='owner'||rev.first_affected_edition!=='2026-09-18'||
     rev.edition_date!=='2026-10-27'||!Number.isInteger(rev.expected_min_affected_editions)||
     rev.expected_min_affected_editions<25)
    fail('revision_not_scoped_to_owner_approved_podcast_repair');
  if(!historySite||!fs.existsSync(historySite)||!outSite||fs.existsSync(outSite))
    fail('invalid_source_or_preexisting_output');
  const published=JSON.parse(read(historySite,'data/watchlist.json').toString('utf8'));
  if(published.edition_date!==rev.edition_date)
    fail('latest_published_edition_changed:prevent_stale_homepage_rewrite');
  const days=fs.readdirSync(path.join(historySite,'briefs'),{withFileTypes:true})
    .filter(e=>e.isDirectory()&&DATE.test(e.name)&&
      e.name>=rev.first_affected_edition&&e.name<=rev.edition_date)
    .map(e=>e.name).sort();
  if(days.length<rev.expected_min_affected_editions||
     !days.includes(rev.first_affected_edition)||!days.includes(rev.edition_date))
    fail('archive_inventory_mismatch');
  const routes=days.map(date=>'briefs/'+date+'/index.html');
  routes.push('index.html','latest.html','latest.md');
  for(const route of routes)if(!fs.existsSync(path.join(historySite,route)))
    fail('missing_expected_publication_route:'+route);
  const archive=inventory(historySite);
  fs.cpSync(historySite,outSite,{recursive:true,force:true});
  const changed=[],affectedDates=new Set();
  let linksFixed=0,latestVariants=0,latestDateLinks=0;
  for(const route of routes){
    const prior=read(historySite,route).toString('utf8');
    const fixed=repairPodcastOverviewContent(prior,route);
    if(fixed.links_fixed===0)continue;
    fs.writeFileSync(path.join(outSite,route),fixed.text,'utf8');
    linksFixed+=fixed.links_fixed;
    if(route.startsWith('briefs/')){
      const date=route.split('/')[1];
      affectedDates.add(date);
      if(date===rev.edition_date)latestDateLinks=fixed.links_fixed;
    }else latestVariants++;
    changed.push({route,previous_sha256:sha(Buffer.from(prior)),
      current_sha256:sha(Buffer.from(fixed.text)),podcast_links_repaired:fixed.links_fixed});
  }
  if(affectedDates.size<rev.expected_min_affected_editions||latestVariants!==3||
     latestDateLinks!==2||changed.length!==affectedDates.size+3||
     linksFixed!==2*(affectedDates.size+3)||changed.length>150)
    fail('incomplete_or_unexpected_repair_census:'+affectedDates.size+':'+latestVariants+':'+linksFixed);
  const updatedInventory=inventory(outSite);
  if(JSON.stringify(archive)!==JSON.stringify(updatedInventory))
    fail('site_inventory_changed');
  const allowed=new Set(changed.map(x=>x.route));
  for(const route of archive){
    const old=read(historySite,route),next=read(outSite,route);
    if(allowed.has(route)){
      if(old.equals(next))fail('claimed_but_unchanged_route:'+route);
    }else if(!old.equals(next))fail('unauthorized_reader_or_image_mutation:'+route);
  }
  return {schema_version:'daily-compiler-podcast-overview-anchor-correction-v1',
    result:'PASS',edition_date:rev.edition_date,first_affected_edition:rev.first_affected_edition,
    affected_editions:affectedDates.size,links_fixed:linksFixed,latest_variants_changed:latestVariants,
    files_changed:changed.length,editorial_bundles_unchanged:true,media_sources_unchanged:true,
    accepted_images_regenerated:0,all_other_site_bytes_preserved:true,changed};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
  if(!receiptFile)fail('usage: correct-podcast-overview-anchors.mjs <revision> <history/site> <output/site> <receipt>');
  const result=correctPodcastOverviewAnchors({revisionFile,historySite,outSite});
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({result:result.result,affected_editions:result.affected_editions,
    links_fixed:result.links_fixed,files_changed:result.files_changed}));
}
