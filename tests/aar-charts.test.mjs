import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildAarCharts,writeAarCharts,renderAarChartsMarkdown,renderAarChartSvg} from '../scripts/aar-charts.mjs';

const edition='2026-11-03';
function input(){
 const stories=Array.from({length:6},(_,i)=>({id:'s'+i,headline:'Story '+i}));
 return {edition,coverage:{eligible:87,inspected:27},compilerVerified:true,imageEvidenceVerified:true,
  bundle:{edition_date:edition,stories,videos:[{url:'v1'},{url:'v2'}],podcasts:[{url:'p1'},{url:'p2'}]},
  imageAar:{edition_date:edition,production:{accepted_count:6,actual_generation_count:12,rejected_count:6},
   images:stories.map((s,i)=>({story_id:s.id,generation_attempts:[3,1,2,2,2,2][i]}))},
  top10:{edition_date:edition,consumed_commit_independently_verified:true,search_status:'RECEIPTS_OBSERVED',
   daily_improvement:{outcome_metrics:{selected_article_count:3,selected_video_count:0,selected_podcast_count:1}},
   selection_mapping_status:'MATCHES_EDITION_BUNDLE',selected_mappings:[
    ...['s0','s1','s2'].map(item_id=>({format:'article',item_id})),
    {format:'podcast',item_id:'p1',topic_id:'topic1'},{format:'podcast',item_id:'p1',topic_id:'topic2'}]}};
}
test('recorded baseline has accurate source, per-story rework and deduplicated format counts',()=>{
 const m=buildAarCharts(input());const [source,images,selected]=m.charts;
 assert.deepEqual(source.rows,[{label:'Inspected',value:27},{label:'Not inspected',value:60}]);
 assert.equal(source.inspected_percent,31);assert.equal(images.total_attempts,12);assert.equal(images.first_pass_accepted,1);
 assert.deepEqual(images.rows.map(x=>x.rejected),[2,0,1,1,1,1]);assert.equal(selected.linked_items,4);
 assert.deepEqual(selected.rows,[{label:'Articles',linked:3,other:3},{label:'Videos',linked:0,other:2},{label:'Podcasts',linked:1,other:1}]);
});
test('unknown, stale, unpublished and contradictory evidence is never rendered as zero or success',()=>{
 const x=input();x.coverage.inspected=null;x.imageAar.edition_date='2026-11-02';x.compilerVerified=false;
 const model=buildAarCharts(x);assert.ok(model.charts.every(c=>c.status==='NOT_RECORDED'&&c.rows===null));
 const y=input();y.imageAar.production.actual_generation_count=11;
 assert.equal(buildAarCharts(y).charts[1].status,'NOT_RECORDED');
 y.coverage.inspected=88;assert.equal(buildAarCharts(y).charts[0].status,'NOT_RECORDED');
 const z=input();z.top10.search_status='INVALID';assert.equal(buildAarCharts(z).charts[2].status,'NOT_RECORDED');
});
test('observed zero mappings are distinct from absent mapping evidence',()=>{
 const x=input();x.top10.selected_mappings=[];x.top10.selection_mapping_status='NONE_RECORDED';
 x.top10.daily_improvement.outcome_metrics={selected_article_count:0,selected_video_count:0,selected_podcast_count:0};
 assert.equal(buildAarCharts(x).charts[2].linked_items,0);
 x.top10.daily_improvement.outcome_metrics.selected_podcast_count=null;
 assert.equal(buildAarCharts(x).charts[2].rows,null);
 x.top10=null;assert.equal(buildAarCharts(x).charts[2].rows,null);
});
test('all figures and numeric tables are deterministic, self-contained and safely escaped',()=>{
 const x=input();x.bundle.stories[0].headline='Unexpected <script> & "label"';
 const m=buildAarCharts(x),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aar-charts-'));
 try{
  writeAarCharts(m,tmp);const first=fs.readFileSync(path.join(tmp,'charts/image-rework.svg'),'utf8');
  writeAarCharts(m,tmp);assert.equal(fs.readFileSync(path.join(tmp,'charts/image-rework.svg'),'utf8'),first);
  assert.match(first,/&lt;script&gt;/);assert.doesNotMatch(first,/<script|https:\/\//);
  assert.equal(fs.readdirSync(path.join(tmp,'charts')).length,3);
  const md=renderAarChartsMarkdown(m);assert.match(md,/4 of 10/);assert.match(md,/27 of 87/);assert.match(md,/12 attempts/);
  assert.match(md,/\| Podcasts \| 1 \| 1 \|/);assert.match(md,/quality cutoff/);
  assert.match(renderAarChartSvg({id:'x',title:'Missing',status:'NOT_RECORDED'},edition),/Not recorded/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('dated targets expire and historical editions do not acquire new chart artifacts',()=>{
 assert.equal(buildAarCharts({...input(),edition:'2026-11-02'}),null);
 const x=input();x.edition='2026-11-06';x.bundle.edition_date=x.edition;x.imageAar.edition_date=x.edition;
 assert.equal(buildAarCharts(x).charts[1].target,null);
});
test('existing report workflow stages the chart helper without adding a schedule',()=>{
 const w=fs.readFileSync('.github/workflows/daily-operations-report.yml','utf8');
 assert.match(w,/cp scripts\/aar-charts\.mjs "\$tmp\/aar-charts\.mjs"/);
 assert.match(w,/'scripts\/aar-charts\.mjs'/);
});
test('the unified renderer emits all three dated chart assets, JSON and report references',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aar-chart-integration-'));
 try{
  const evidence=path.join(tmp,'evidence'),output=path.join(tmp,'output');fs.mkdirSync(evidence);
  const b=input().bundle;b.source_discovery_audit={index_review:{eligible:87,inspected:27}};
  fs.writeFileSync(path.join(evidence,'edition-bundle.json'),JSON.stringify(b));
  execFileSync(process.execPath,['scripts/render-unified-production-aar.mjs','2026-11-02',evidence,output]);
  const model=JSON.parse(fs.readFileSync(path.join(output,'charts.json')));
  assert.equal(model.charts[0].rows[0].value,27);
  assert.equal(model.charts[1].status,'NOT_RECORDED');assert.equal(model.charts[2].status,'NOT_RECORDED');
  const md=fs.readFileSync(path.join(output,'combined.md'),'utf8');
  for(const c of model.charts){assert.ok(fs.existsSync(path.join(output,'charts',c.id+'.svg')));assert.ok(md.includes('](charts/'+c.id+'.svg)'));}
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'combined.json'))).charts,model);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
