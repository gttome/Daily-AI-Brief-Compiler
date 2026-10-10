import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {injectZoomIntoAcceptedPage} from '../scripts/stage-published-mobile-zoom.mjs';
import {OCT8_LIVE_BASELINE} from '../scripts/audit-oct8-live.mjs';
const d='2026-10-10';
const header='<!doctype html><html><head><title>Accepted article</title></head><body class="reader-release" data-brief-date="2026-10-10">';
const img=(i)=>'<p><img src="https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/images/'+d+'/dab-edition-'+d+'-'+i+'.png?v=123456789abc" alt="Exact original accepted explanatory text." /></p>';
const footer='<article>Original source links, dates, why it matters and editorial content stay untouched.</article></body></html>';

test('zoom enhancement changes no accepted image src/alt, does not rewrite editorial article bytes',()=>{
 const original=header+img('m01')+footer;
 const patched=injectZoomIntoAcceptedPage(original,{date:d,expectedCount:1});
 assert.match(patched,/premium-image-zoom\.css\?v=1/);
 assert.match(patched,/premium-image-zoom\.js\?v=1/);
 const undo=patched.replace('  <link rel="stylesheet" href="/Daily-AI-Brief-Compiler/assets/css/premium-image-zoom.css?v=1">\n','')
   .replace('  <script defer src="/Daily-AI-Brief-Compiler/assets/js/premium-image-zoom.js?v=1"></script>\n','');
 assert.equal(undo,original);
 assert.match(patched,/Original source links, dates, why it matters and editorial content stay untouched/);
 assert.throws(()=>injectZoomIntoAcceptedPage(patched,{date:d,expectedCount:1}),/previously_patched_page/);
});

test('wrong edition or absent image or duplicate premium slot cannot silently pass',()=>{
 const original=header+img('m01')+footer;
 assert.throws(()=>injectZoomIntoAcceptedPage(original,{date:d,expectedCount:6}),/wrong_number/);
 assert.throws(()=>injectZoomIntoAcceptedPage(original.replace('.png?v=','.svg?v='),{date:d,expectedCount:1}),/wrong_number/);
 assert.throws(()=>injectZoomIntoAcceptedPage(original.replace('data-brief-date="2026-10-10"','data-brief-date="2026-10-08"'),{date:d,expectedCount:1}),/noncanonical/);
 assert.throws(()=>injectZoomIntoAcceptedPage(original.replace(/alt="[^"]+"/,'alt=""'),{date:d,expectedCount:1}),/wrong_number/);
 const six=header+['m12','m14','m10','m11','m01','m02'].map(img).join('\n')+footer;
 assert.ok(injectZoomIntoAcceptedPage(six,{date:d,expectedCount:6}).includes('premium-image-zoom'));
 assert.equal(Object.keys(OCT8_LIVE_BASELINE).length,17);
});

test('full-size mobile accessibility preserves pixels; no thumbnail-regeneration, pixel-acceptance shortcut',()=>{
 const browser=fs.readFileSync('assets/premium-image-zoom.js','utf8');
 const css=fs.readFileSync('assets/premium-image-zoom.css','utf8');
 assert.match(browser,/new URL\(img\.currentSrc\|\|img\.src/);
 assert.match(browser,/gttome\.github\.io/);
 assert.match(browser,/Open original image in new tab/);
 assert.match(browser,/Enlarge diagram to read labels/);
 assert.match(browser,/aria-label/);
 assert.match(browser,/dialog\.showModal\(\)/);
 assert.match(browser,/dialog\.close\(\)/);
 assert.match(browser,/full\.src=url;full\.alt=img\.alt/);
 assert.match(css,/width:1200px!important/);
 assert.match(css,/overflow:auto/);
 assert.doesNotMatch(browser,/image_gen|render-shadow-images|regenerat(e|ion)\s*\(/i);
});

test('reader canonical source carries the same fullsize zoom assets into every future daily compile',()=>{
 const assets=[
  ['assets/premium-image-zoom.js','vendor/production-reader/snapshot/assets/js/premium-image-zoom.js'],
  ['assets/premium-image-zoom.css','vendor/production-reader/snapshot/assets/css/premium-image-zoom.css']
 ];
 for(const [preview,canonical] of assets)
   assert.deepEqual(fs.readFileSync(preview),fs.readFileSync(canonical),
     'future reader build must preserve identical tested JS/CSS bytes');
 const layout=fs.readFileSync('vendor/production-reader/snapshot/_layouts/default.html','utf8');
 for(const filename of ['premium-image-zoom.js','premium-image-zoom.css']){
   assert.ok(layout.includes('/assets/'+(filename.endsWith('.js')?'js/':'css/')+filename));
 }
 assert.match(layout, /\{\% if page.reader_release \%\}.*premium-image-zoom\.js/);
 assert.match(layout, /\{\% if page.reader_release \%\}.*premium-image-zoom\.css/);
 const js=fs.readFileSync(assets[0][1],'utf8');
 assert.match(js,/dab-edition-20/);
 assert.match(js,/img\.insertAdjacentElement|figure\.insertAdjacentElement/);
 assert.doesNotMatch(js,/illustration-pending\.svg/);
});
