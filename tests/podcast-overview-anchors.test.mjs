import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renderPodcastItem} from '../vendor/production-reader/snapshot/_generator/lib/reader.mjs';
import {renderEditionOverview} from '../vendor/production-reader/snapshot/_generator/lib/book-reading.mjs';
import {overviewTargets,repairPodcastOverviewContent,correctPodcastOverviewAnchors} from '../scripts/correct-podcast-overview-anchors.mjs';

function slot(date,index){
 return {status:'included',item_id:'dab-podcast-'+date+'-'+index,
   title:'Podcast '+index,permanent_url:'/podcasts/'+date+'/podcast-'+index+'/',
   show:'Original AI Podcast '+index,host:'Host',focus:'agents_non_technical_people',
   publication_date:date,runtime_seconds:1200,topics:['AI'],summary:'Tested',
   why_useful:'Distinct learning outcome',connection:'Different learning outcome',
   coverage_note:'Current source evidence',platforms:[],series_implications:[]};
}
function page(date,markdown=false){
 const podcasts=[slot(date,1),slot(date,2)];
 const links=Array.from({length:8},(_,i)=>'<li><a href="#article-'+i+'">Article or video</a></li>')
   .concat(podcasts.map(p=>'<li><a href="#podcast-'+p.item_id+'">Podcast</a></li>')).join('');
 const overview='<section class="edition-overview"><h2>Choose what matters to your work</h2><ol>'+
   links+'</ol></section>';
 const anchors=Array.from({length:8},(_,i)=>'<span id="article-'+i+'"></span>').join('');
 const body=podcasts.map((p,i)=>(markdown?'### ':'<h3 id="episode-'+(i+1)+'">')+
   (i+9)+'. Podcast '+(i+1)+(markdown?'\n\n':'</h3>\n')+
   '<p><span class="podcast-data" data-podcast-id="'+p.item_id+'" hidden></span></p>').join('\n');
 return overview+'\n'+(markdown?'':anchors)+'\n'+body;
}
test('new generator includes unique podcast targets with titles before metadata',()=>{
 const date='2026-10-28';
 const podcasts=[slot(date,1),slot(date,2)];
 for(const [i,p] of podcasts.entries()){
   const html=renderPodcastItem(p,date,i+9);
   const anchor='<span id="podcast-'+p.item_id+'"></span>';
   assert.ok(html.includes(anchor));
   assert.ok(html.indexOf(anchor)<html.indexOf('### '+(i+9)+'. '));
   assert.ok(html.indexOf(anchor)<html.indexOf('data-podcast-id="'+p.item_id+'"'));
 }
 const overview=renderEditionOverview({
   brief_date:date,stories:[],podcasts,
   worth_watching:{general:{status:'empty'},agents_non_technical_people:{status:'empty'}}
 });
 for(const p of podcasts)assert.ok(overview.includes('href="#podcast-'+p.item_id+'"'));
});
test('HTML and Markdown repair creates matching anchors for both podcast links only',()=>{
 const date='2026-10-27';
 for(const markdown of [false,true]){
   const route=markdown?'latest.md':'briefs/'+date+'/index.html';
   const input=page(date,markdown);
   assert.equal(overviewTargets(input).length,10);
   const patch=repairPodcastOverviewContent(input,route);
   assert.equal(patch.links_fixed,2);
   assert.equal(patch.targets,2);
   for(let i=1;i<=2;i++){
     const id='podcast-dab-podcast-'+date+'-'+i;
     assert.equal(patch.text.split('id="'+id+'"').length-1,1);
     assert.ok(patch.text.indexOf('id="'+id+'"')<
       patch.text.indexOf('data-podcast-id="dab-podcast-'+date+'-'+i+'"'));
   }
   assert.equal(repairPodcastOverviewContent(patch.text,route).links_fixed,0);
   assert.equal((patch.text.match(/<li><a href="#/g)||[]).length,10);
 }
});
test('repair fails closed for missing podcast metadata instead of redirecting to another episode',()=>{
 const date='2026-10-27';
 const input=page(date).replace('data-podcast-id="dab-podcast-'+date+'-1"','data-podcast-id="wrong"');
 assert.throws(()=>repairPodcastOverviewContent(input,'briefs/'+date+'/index.html'),
  /unique_podcast_metadata_missing/);
});
test('archive-wide correction preserves every unrelated file and all mock image bytes',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dab-podcast-nav-'));
 const history=path.join(tmp,'history'),out=path.join(tmp,'out');
 try{
   fs.mkdirSync(path.join(history,'briefs'),{recursive:true});
   fs.mkdirSync(path.join(history,'data'),{recursive:true});
   fs.mkdirSync(path.join(history,'briefs/images/2026-10-20'),{recursive:true});
   const png=Buffer.from([137,80,78,71,1,2,3,4,5,6]);
   fs.writeFileSync(path.join(history,'briefs/images/2026-10-20/accepted.png'),png);
   const dates=Array.from({length:25},(_,i)=>{
     const d=new Date(Date.UTC(2026,8,18+i));return d.toISOString().slice(0,10);
   }).concat(['2026-10-27']);
   for(const date of dates){
     fs.mkdirSync(path.join(history,'briefs',date),{recursive:true});
     fs.writeFileSync(path.join(history,'briefs',date,'index.html'),page(date));
   }
   const date='2026-10-27';
   fs.writeFileSync(path.join(history,'index.html'),page(date));
   fs.writeFileSync(path.join(history,'latest.html'),page(date));
   fs.writeFileSync(path.join(history,'latest.md'),page(date,true));
   fs.writeFileSync(path.join(history,'data/watchlist.json'),JSON.stringify({edition_date:date}));
   const revFile=path.join(tmp,'revision.json');
   fs.writeFileSync(revFile,JSON.stringify({
     schema_version:'daily-compiler-reading-copy-correction-v1',
     correction_type:'PODCAST_OVERVIEW_ANCHORS_ONLY',scope:'EXISTING_READER_PODCAST_NAVIGATION_ONLY',
     requested_by:'owner',first_affected_edition:'2026-09-18',edition_date:date,
     expected_min_affected_editions:25
   }));
   const result=correctPodcastOverviewAnchors({revisionFile:revFile,historySite:history,outSite:out});
   assert.equal(result.result,'PASS');
   assert.equal(result.affected_editions,26);
   assert.equal(result.latest_variants_changed,3);
   assert.equal(result.links_fixed,58);
   assert.equal(result.files_changed,29);
   assert.deepEqual(fs.readFileSync(path.join(out,'briefs/images/2026-10-20/accepted.png')),png);
   assert.deepEqual(fs.readFileSync(path.join(out,'data/watchlist.json')),
     fs.readFileSync(path.join(history,'data/watchlist.json')));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
