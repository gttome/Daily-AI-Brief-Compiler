import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rebuildHistoryDiscovery} from '../scripts/rebuild-history-discovery.mjs';

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'archive-rebuild-'));
  const put=(rel,content)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);};
  const page=(id,title,summary,date)=>'<html><head><meta name="description" content="'+summary+'"/><meta property="og:title" content="'+title+'"/></head>'+
    '<body data-story-id="'+id+'"><h1 class="project-name">'+title+'</h1><p><strong>Summary:</strong> '+summary+'</p>'+
    '<strong>Date:</strong> '+date+'</body></html>';
  for(const date of ['2026-10-17','2026-10-18']){
    put('briefs/'+date+'/index.html','<html><title>Brief '+date+'</title></html>');
    put('stories/'+date+'/story-one/index.html',page('dab-story-'+date+'-m01','Story on '+date,'Verified story summary',date));
    put('videos/'+date+'/general/index.html',page('dab-video-'+date+'-general','Video on '+date,'Verified video summary',date));
    put('podcasts/'+date+'/podcast-one/index.html',page('dab-podcast-'+date+'-1','Podcast on '+date,'Verified podcast summary',date));
  }
  put('data/archive-index.json',JSON.stringify({schema_version:'1.0.0',generated_from:'test',stories:[
    {content_type:'Article',story_id:'dab-story-2026-10-18-m01',brief_date:'2026-10-18',event_date:'2026-10-18',headline:'Story on 2026-10-18',
      url:'/stories/2026-10-18/story-one/',focus:'technical_ai_engineering',topics:[],companies:[],evidence_type:'publisher_authored',
      availability_status:'available',trends:[],summary:'Verified story summary'}
  ]}));
  put('briefs-archive/index.html','<html><p id="archive-result-count" role="status">1 items</p>'+
    '<div id="archive-results" class="archive-results">\nold item\n</div>\n</section>\n<noscript>'+
    '<section><p id="archive-edition-count" role="status">1 complete editions</p>'+
    '<div id="archive-editions">\nold dates\n</div>\n<p id="archive-editions-empty" hidden>empty</p></section></html>');
  put('feed.json',JSON.stringify({version:'https://jsonfeed.org/version/1.1',title:'Brief',home_page_url:'https://gttome.github.io/Daily-AI-Brief-Compiler/',
    items:[{id:'dab-story-2026-10-18-m01',url:'https://gttome.github.io/Daily-AI-Brief-Compiler/stories/2026-10-18/story-one/',title:'Story on 2026-10-18'}]}));
  put('feed.xml','<?xml version="1.0"?><feed><entry><title>Story on 2026-10-18</title><id>dab-story-2026-10-18-m01</id></entry></feed>');
  put('daily-feed.xml','<rss><channel><item><title>Daily AI Brief — 2026-10-18</title></item></channel></rss>');
  return root;
}
test('rebuilds every preserved dated edition, discovery record and both RSS formats without touching pages',()=>{
  const root=fixture();
  const image=path.join(root,'briefs','images','2026-10-17','accepted.png');
  fs.mkdirSync(path.dirname(image),{recursive:true});fs.writeFileSync(image,'KEEP ACCEPTED IMAGE BYTES');
  const prior=fs.readFileSync(path.join(root,'stories','2026-10-17','story-one','index.html'));
  const result=rebuildHistoryDiscovery(root);
  assert.equal(result.result,'PASS');
  assert.equal(result.edition_count,2);
  assert.equal(result.original_index_edition_count,1);
  assert.equal(result.discovered_item_count,6);
  assert.equal(result.recovered_items,5);
  const archive=fs.readFileSync(path.join(root,'briefs-archive','index.html'),'utf8');
  for(const date of ['2026-10-17','2026-10-18']){
    assert.match(archive,new RegExp('data-archive-edition="'+date+'"'));
    assert.match(fs.readFileSync(path.join(root,'daily-feed.xml'),'utf8'),new RegExp('Daily AI Brief — '+date));
  }
  assert.equal((archive.match(/data-archive-edition=/g)||[]).length,2);
  const data=JSON.parse(fs.readFileSync(path.join(root,'data','archive-index.json'),'utf8'));
  assert.equal(data.stories.length,6);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'feed.json'),'utf8')).items.length,6);
  assert.equal((fs.readFileSync(path.join(root,'feed.xml'),'utf8').match(/<entry>/g)||[]).length,6);
  assert.equal(fs.readFileSync(image,'utf8'),'KEEP ACCEPTED IMAGE BYTES');
  assert.deepEqual(fs.readFileSync(path.join(root,'stories','2026-10-17','story-one','index.html')),prior);
});
test('reconciliation is idempotent and never duplicates archive cards or feed records',()=>{
  const root=fixture();rebuildHistoryDiscovery(root);
  const again=rebuildHistoryDiscovery(root);
  assert.equal(again.recovered_items,0);
  assert.equal(again.edition_count,2);
  const html=fs.readFileSync(path.join(root,'briefs-archive','index.html'),'utf8');
  assert.equal((html.match(/data-archive-edition=/g)||[]).length,2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'feed.json'),'utf8')).items.length,6);
  assert.equal((fs.readFileSync(path.join(root,'daily-feed.xml'),'utf8').match(/<item>/g)||[]).length,2);
});
