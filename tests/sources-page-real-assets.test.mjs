import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {
 SOURCE_CSS,SOURCE_JS,PUBLIC_CSS,PUBLIC_JS,
 validateSourceAssets,appendSourcesAssetsToJekyllLayout,
 repairPublishedSourceMarkup,assertSourcesPageAssets
} from '../compiler/sources-page-assets.mjs';
import {renderSourcesMarkdown,sourceRegistrySummary} from '../compiler/source-transparency.mjs';
import {prepareSourcesJekyll} from '../scripts/prepare-sources-jekyll.mjs';
import {stageSourcesAssetRepair} from '../scripts/stage-sources-page-assets.mjs';
const css=fs.readFileSync(SOURCE_CSS,'utf8'),js=fs.readFileSync(SOURCE_JS,'utf8');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function original(){
 const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
 const content=renderSourcesMarkdown(registry);
 const html=content.slice(content.indexOf('---',5)+3);
 const leaked='<main id="content" class="main-content" role="main">\n'+
   '&lt;style>\n'+css.trim()+'\n</style>\n'+html+
   '\n&lt;script>\n'+js.trim()+'\n</script>\n</main>';
 return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
   '<body>'+leaked+'</body></html>';
}
test('canonical Jekyll Sources content does not contain code blocks',()=>{
 const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
 const body=renderSourcesMarkdown(registry);
 assert.ok(!body.includes('<style>'));
 assert.ok(!body.includes('<script>'));
 assert.equal((body.match(/class="src-source-card"/g)||[]).length,sourceRegistrySummary(registry).registered);
 assert.doesNotThrow(()=>new vm.Script(js));
 const result=validateSourceAssets(css,js);
 assert.equal(result.cssHash.length,12);
 assert.equal(result.jsHash.length,12);
});
test('explicit real CSS/JS asset links load only on Sources Jekyll route',()=>{
 const fixture='<html><head></head><body>Content</body></html>';
 const next=appendSourcesAssetsToJekyllLayout(fixture);
 assert.match(next,/page.permalink == '\/sources\/'/);
 assert.match(next,/sources-transparency.css/);
 assert.match(next,/sources-transparency.js/);
 assert.throws(()=>appendSourcesAssetsToJekyllLayout(next),/already_enhanced/);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sources-real-build-'));
 try{
  const out=path.join(tmp,'jekyll');
  const report=prepareSourcesJekyll({outRoot:out});
  assert.equal(report.result,'PASS');
  for(const route of [PUBLIC_CSS,PUBLIC_JS])assert.equal(fs.existsSync(path.join(out,route)),true);
  const layout=fs.readFileSync(path.join(out,'_layouts/default.html'),'utf8');
  assert.ok(layout.includes("'/sources/'"));
  assert.ok(fs.readFileSync(path.join(out,'sources.md'),'utf8').includes('id="src-search"'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('scoped production repair moves visible CSS/JS into head and deferred asset script',()=>{
 const old=original(),fixed=repairPublishedSourceMarkup(old,{css,js});
 assert.equal(assertSourcesPageAssets(fixed),true);
 assert.ok(fixed.includes('<link rel="stylesheet"'));
 assert.ok(fixed.includes('<script defer src="/Daily-AI-Brief-Compiler/assets/js/sources-transparency.js'));
 assert.ok(!fixed.includes('&lt;style>'));
 assert.ok(!fixed.includes('&lt;script>'));
 assert.throws(()=>repairPublishedSourceMarkup(fixed,{css,js}),/already_fixed/);
 assert.throws(()=>repairPublishedSourceMarkup(old,{css:css+'a{}',js}),/drift_from_protected_assets/);
});
test('asset script filters enabled sources and updates local display state',()=>{
 const handlers={};const input={value:'',addEventListener(name,fn){handlers['input:'+name]=fn;}};
 const role={value:'all',addEventListener(name,fn){handlers['role:'+name]=fn;}};
 const state={value:'true',addEventListener(name,fn){handlers['state:'+name]=fn;}};
 const more={hidden:true,addEventListener(name,fn){handlers['more:'+name]=fn;}};
 const total={textContent:''},empty={hidden:true};
 const cards=Array.from({length:30},(_,i)=>({
   hidden:false,
   dataset:{search:'gardening agent '+i,roles:i<3?'article':'video',enabled:i<28?'true':'false'}
 }));
 const els={'#src-search':input,'#src-role':role,'#src-state':state,'#src-results':total,
   '#src-show-more':more,'#src-no-results':empty};
 const root={querySelector(q){return els[q];},querySelectorAll(q){return q==='.src-source-card'?cards:[];}};
 vm.runInNewContext(js,{document:{querySelector(q){return q==='#sources-transparency'?root:null;}},Array});
 assert.equal(cards.filter(x=>!x.hidden).length,24);
 assert.equal(total.textContent,'Showing 24 of 28 matching sources');
 assert.equal(more.hidden,false);
 handlers['more:click']();
 assert.equal(cards.filter(x=>!x.hidden).length,28);
 role.value='article';handlers['role:change']();
 assert.equal(cards.filter(x=>!x.hidden).length,3);
});
test('only the one Sources HTML route and two new static assets may change',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sources-asset-revision-'));
 const history=path.join(root,'history'),out=path.join(root,'out'),revisionFile=path.join(root,'revision.json');
 try{
  fs.mkdirSync(path.join(history,'sources'),{recursive:true});
  fs.mkdirSync(path.join(history,'briefs/2026-10-28'),{recursive:true});
  fs.mkdirSync(path.join(history,'briefs/images/2026-10-28'),{recursive:true});
  const page=Buffer.from(original()),png=Buffer.from([137,80,78,71,26,27,28]);
  fs.writeFileSync(path.join(history,'sources/index.html'),page);
  fs.writeFileSync(path.join(history,'briefs/2026-10-28/index.html'),'<h1>Preserved edition</h1>');
  fs.writeFileSync(path.join(history,'briefs/images/2026-10-28/keep.png'),png);
  fs.writeFileSync(revisionFile,JSON.stringify({
   schema_version:'daily-compiler-reading-copy-correction-v1',
   correction_type:'SOURCES_ASSETS_CSS_JS_FIX',
   scope:'SOURCES_HTML_AND_TWO_NEW_PUBLIC_ASSETS_ONLY',
   requested_by:'owner',edition_date:'2026-10-28',
   expected_previous_sources_blob_sha:blob(page),
   expected_css_blob_sha:blob(Buffer.from(css)),
   expected_js_blob_sha:blob(Buffer.from(js))
  }));
  const report=stageSourcesAssetRepair({revisionFile,historySite:history,outSite:out});
  assert.equal(report.files_changed,3);
  assert.deepEqual(report.changed.map(x=>x.route),['sources/index.html',PUBLIC_CSS,PUBLIC_JS]);
  assert.deepEqual(fs.readFileSync(path.join(out,'briefs/images/2026-10-28/keep.png')),png);
  assert.ok(fs.readFileSync(path.join(out,'briefs/2026-10-28/index.html'),'utf8').includes('Preserved edition'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
