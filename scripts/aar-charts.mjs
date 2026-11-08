// Deterministic report figures only. No network, model calls or publication effects.
import fs from 'node:fs';
import path from 'node:path';

const count = x => Number.isSafeInteger(x) && x >= 0;
const xml = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const cell = x => String(x).replace(/[|\r\n]/g, ' ');
const sum = xs => xs.reduce((a,b) => a+b,0);
const names = ['research-coverage','image-rework','top10-selection'];
export const AAR_CHART_FILES = names.map(n => `charts/${n}.svg`);

export function buildAarCharts({edition, coverage, bundle, imageAar, imageEvidenceVerified, top10, compilerVerified}) {
  if (edition < '2026-11-03') return null;
  const missing = (id,title,description) => ({id,title,description,status:'NOT_RECORDED',rows:null});
  const research = missing(names[0],'Research coverage','Editorial source-index inspection; automated fetches are excluded.');
  if (count(coverage?.eligible) && coverage.eligible > 0 && count(coverage.inspected) && coverage.inspected <= coverage.eligible) {
    Object.assign(research,{status:'OBSERVED',total:coverage.eligible,inspected_percent:Math.round(coverage.inspected/coverage.eligible*100),
      rows:[{label:'Inspected',value:coverage.inspected},{label:'Not inspected',value:coverage.eligible-coverage.inspected}]});
  }
  research.note='Not inspected includes every index without a recorded editorial inspection; this is not proof of missed stories.';

  const rework = missing(names[1],'Image attempts and rework','Accepted and rejected candidates for each final image.');
  const stories = bundle?.edition_date === edition && Array.isArray(bundle.stories) ? bundle.stories : [];
  const aar = imageAar?.edition_date === edition ? imageAar : null;
  const attempts = aar?.images;
  const p = aar?.production;
  if (imageEvidenceVerified && Array.isArray(attempts) && attempts.length === 6 && stories.length === 6 &&
      new Set(attempts.map(x=>x.story_id)).size === 6 &&
      attempts.every(x=>count(x.generation_attempts)&&x.generation_attempts>=1&&stories.some(s=>s.id===x.story_id)) &&
      p?.accepted_count === 6 && count(p.actual_generation_count) && count(p.rejected_count) &&
      sum(attempts.map(x=>x.generation_attempts)) === p.actual_generation_count && p.rejected_count === p.actual_generation_count-6) {
    const rows = stories.map(s=>({id:s.id,label:s.headline||s.id,accepted:1,
      rejected:attempts.find(x=>x.story_id===s.id).generation_attempts-1}));
    Object.assign(rework,{status:'OBSERVED',rows,total_attempts:p.actual_generation_count,
      first_pass_accepted:rows.filter(x=>x.rejected===0).length,
      target:edition<='2026-11-05'?{first_pass:3,max_attempts:2,window:'November 3–5, 2026'}:
        edition>='2026-11-08'?{first_pass:3,max_attempts:2,window:'ongoing from November 8'}:null});
  }
  rework.note='Generation attempts measure rework, not runtime or cost. Quality and publication checks remain separate.';

  const selected = missing(names[2],'Top 10 links to published items','Unique published items by format, not the number of topic mappings.');
  const formats = [['article','stories','Articles'],['video','videos','Videos'],['podcast','podcasts','Podcasts']];
  const outcome=top10?.daily_improvement?.outcome_metrics;
  if (compilerVerified && bundle?.edition_date === edition && top10?.edition_date === edition &&
      top10.consumed_commit_independently_verified === true && top10.search_status === 'RECEIPTS_OBSERVED' &&
      ['MATCHES_EDITION_BUNDLE','NONE_RECORDED'].includes(top10.selection_mapping_status) &&
      formats.every(([format])=>count(outcome?.[`selected_${format}_count`])) &&
      Array.isArray(top10.selected_mappings) && formats.every(([,key])=>Array.isArray(bundle[key]))) {
    const rows = formats.map(([format,key,label])=>{
      const ids = new Set(top10.selected_mappings.filter(m=>m.format===format).map(m=>m.item_id));
      const linked = bundle[key].filter(x=>ids.has(x.id??x.source?.url??x.url)).length;
      return {label,linked,other:bundle[key].length-linked};
    });
    if(rows.every((r,i)=>r.linked===outcome[`selected_${formats[i][0]}_count`]))
      Object.assign(selected,{status:'OBSERVED',rows,linked_items:sum(rows.map(x=>x.linked)),total_items:sum(rows.map(x=>x.linked+x.other))});
  }
  selected.note='No selection quota. Topic linkage does not establish better quality, popularity or causal improvement.';
  return {schema_version:'daily-ai-brief-aar-charts-v1',edition_date:edition,charts:[research,rework,selected],
    interpretation:'One edition at a time. Missing evidence is not zero. Trend claims require comparable recorded cycles.'};
}

function wrap(text,limit=43) {
  const words=String(text).match(/\S{1,43}/g)||[''];
  const lines=[];let line='';
  for(const word of words){if(line&&line.length+word.length+1>limit){lines.push(line);line='';}line+=(line?' ':'')+word;}
  if(line)lines.push(line);return lines;
}
function text(x,y,value,size=26,extra='') {
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${xml(value)}</text>`;
}
function frame(chart,edition,height,body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}" role="img" aria-labelledby="title desc">
<title id="title">${xml(chart.title)} — ${xml(edition)}</title><desc id="desc">${xml(chart.description)} ${xml(chart.status==='OBSERVED'?JSON.stringify(chart.rows):'Not recorded: current-edition evidence is missing or inconsistent.')}</desc>
<rect width="640" height="${height}" fill="#ffffff"/>
<g font-family="Arial, sans-serif" fill="#24343d">${text(28,40,chart.title,30)}${text(28,76,`Edition ${edition}`,24)}${body}</g></svg>\n`;
}
export function renderAarChartSvg(chart,edition) {
  if(chart.status!=='OBSERVED')return frame(chart,edition,190,text(28,133,'Not recorded',28)+text(28,170,'Current-edition evidence is incomplete.',24));
  if(chart.id==='research-coverage'){
    const fraction=chart.rows[0].value/chart.total;
    const circ=2*Math.PI*78;
    return frame(chart,edition,380,
      `<circle cx="320" cy="205" r="78" fill="none" stroke="#c7d4dc" stroke-width="36"/>
<circle cx="320" cy="205" r="78" fill="none" stroke="#246b62" stroke-width="36" stroke-dasharray="${fraction*circ} ${circ}" transform="rotate(-90 320 205)"/>`+
      text(320,208,`${chart.inspected_percent}%`,36,'text-anchor="middle"')+text(320,238,'inspected',24,'text-anchor="middle"')+
      '<rect x="28" y="316" width="20" height="20" fill="#246b62"/>'+text(60,335,`Inspected: ${chart.rows[0].value} / ${chart.total}`,26)+
      '<rect x="28" y="352" width="20" height="20" fill="#c7d4dc"/>'+text(60,371,`Not inspected: ${chart.rows[1].value}`,26));
  }
  const image=chart.id==='image-rework', first=image?'accepted':'linked', second=image?'rejected':'other';
  const max=Math.max(1,...chart.rows.map(r=>r[first]+r[second]));
  let y=130;
  let body='<rect x="28" y="96" width="20" height="20" fill="#246b62"/>'+text(60,114,image?'Accepted':'Linked to Top 10',24)+
    '<rect x="344" y="96" width="20" height="20" fill="#ad512f"/>'+text(376,114,image?'Rejected':'Other items',24);
  for(const row of chart.rows){
    for(const line of wrap(row.label)){y+=32;body+=text(28,y,line,26);}
    y+=14;
    const a=row[first]/max*560,b=row[second]/max*560;
    body+=`<rect x="28" y="${y}" width="${a}" height="30" fill="#246b62"/><rect x="${28+a}" y="${y}" width="${b}" height="30" fill="#ad512f"/>`;
    y+=61;body+=text(28,y,image?`${row.accepted} accepted + ${row.rejected} rejected = ${row.accepted+row.rejected} attempts`:
      `${row.linked} linked + ${row.other} other = ${row.linked+row.other} items`,24);y+=22;
  }
  y+=12;body+=`<line x1="28" y1="${y}" x2="588" y2="${y}" stroke="#56656a"/>`;
  const ticks=[...new Set([0,Math.ceil(max/3),Math.ceil(max*2/3),max])];
  for(const n of ticks)body+=text(28+n/max*560,y+31,n,24,`text-anchor="${n===0?'start':n===max?'end':'middle'}"`);
  body+=text(28,y+68,image?'Generation attempts per image':'Published items per format',24);
  return frame(chart,edition,y+90,body);
}

export function renderAarChartsMarkdown(model) {
  if(!model)return '';
  const lines=['## Daily AAR charts','','These charts use this edition’s receipts. Missing data is not zero.',''];
  for(const c of model.charts){
    lines.push(`### ${c.title}`,'',`![${c.title}: ${c.status==='OBSERVED'?'recorded results':'not recorded'}](charts/${c.id}.svg)`,'');
    if(c.status!=='OBSERVED')lines.push('**Not recorded:** current-edition evidence is missing or inconsistent.','');
    else if(c.id==='research-coverage')lines.push(`**${c.rows[0].value} of ${c.total} indexes inspected (${c.inspected_percent}%).**`,'','| Editorial inspection | Indexes |','|---|---:|',...c.rows.map(r=>`| ${cell(r.label)} | ${r.value} |`),'');
    else if(c.id==='image-rework'){
      lines.push(`**${c.total_attempts} attempts; ${c.first_pass_accepted} of ${c.rows.length} images accepted on their first attempt.**`,'');
      if(c.target)lines.push(`Recorded ${c.target.window} target: at least ${c.target.first_pass}/6 first-pass accepts; no more than ${c.target.max_attempts} attempts per image. This is an efficiency target, not a quality cutoff.`,'');
      lines.push('| Image | Accepted | Rejected | Total attempts |','|---|---:|---:|---:|',...c.rows.map(r=>`| ${cell(r.label)} | ${r.accepted} | ${r.rejected} | ${r.accepted+r.rejected} |`),'');
    }else lines.push(`**${c.linked_items} of ${c.total_items} unique published items link to Top 10 topics.**`,'','| Format | Linked to Top 10 | Other items |','|---|---:|---:|',...c.rows.map(r=>`| ${r.label} | ${r.linked} | ${r.other} |`),'');
    lines.push(c.note,'');
  }
  lines.push('[Chart data](charts.json)','',model.interpretation,'');return lines.join('\n');
}

export function writeAarCharts(model,output) {
  if(!model)return;
  fs.mkdirSync(path.join(output,'charts'),{recursive:true});
  for(const chart of model.charts)fs.writeFileSync(path.join(output,'charts',chart.id+'.svg'),renderAarChartSvg(chart,model.edition_date));
  fs.writeFileSync(path.join(output,'charts.json'),JSON.stringify(model,null,2)+'\n');
}
