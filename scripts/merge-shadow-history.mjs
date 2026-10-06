import fs from 'node:fs';
import path from 'node:path';

const historyDir=process.argv[2];
const currentDir=process.argv[3];
const outDir=process.argv[4];
if(!currentDir||!outDir) throw new Error('usage: node scripts/merge-shadow-history.mjs <history-site-or-dash> <current-site> <out-site>');

const copyDir=(src,dst)=>{
  if(!src||src==='-'||!fs.existsSync(src)) return;
  fs.mkdirSync(dst,{recursive:true});
  fs.cpSync(src,dst,{recursive:true,force:true});
};
const readJson=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const historyFeed=historyDir&&historyDir!=='-'?readJson(path.join(historyDir,'feed.json')):null;
const currentFeed=readJson(path.join(currentDir,'feed.json'));
if(!currentFeed?.latest||!Array.isArray(currentFeed.editions)||currentFeed.editions.length!==1){
  throw new Error('current reader feed invalid');
}

fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});
copyDir(historyDir,outDir);
copyDir(currentDir,outDir);

const merged=new Map();
for(const edition of historyFeed?.editions||[]) merged.set(edition.date,edition);
for(const edition of currentFeed.editions) merged.set(edition.date,edition);
const editions=[...merged.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
const feed={version:'daily-ai-brief-feed-v1',latest:currentFeed.latest,editions};
fs.writeFileSync(path.join(outDir,'feed.json'),JSON.stringify(feed,null,2)+'\n');

const cards=editions.map(e=>`
<article>
  <h2><a href="../${esc(e.route)}">${esc(e.date)}</a></h2>
  <p>${e.stories?.length||0} permanent stories</p>
  <ul>${(e.stories||[]).map(s=>`<li><a href="../${esc(s.route)}">${esc(s.headline)}</a> <span>— ${esc(s.focus)}</span></li>`).join('')}</ul>
</article>`).join('');

const archive=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daily AI Brief Archive</title>
<style>
body{margin:0;background:#f4f7fb;color:#172033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:960px;margin:auto;padding:28px 18px 56px}a{color:#1457b8}header,article{background:#fff;border:1px solid #dbe4ee;border-radius:18px;padding:20px;margin:0 0 16px}
h1{font-size:clamp(2rem,5vw,3rem);margin:.2rem 0}li{margin:.45rem 0}span{color:#64768b}
</style></head><body><main>
<header><p><a href="../">← Latest Brief</a></p><h1>Earlier Briefs</h1><p>Permanent dated editions and story pages from the Daily AI Brief Compiler.</p></header>
${cards}
</main></body></html>\n`;
fs.mkdirSync(path.join(outDir,'archive'),{recursive:true});
fs.writeFileSync(path.join(outDir,'archive','index.html'),archive);

const receipt={
  schema_version:'daily-compiler-history-merge-v1',
  result:'PASS',
  latest:currentFeed.latest,
  edition_count:editions.length,
  preserved_prior_editions:Math.max(0,editions.length-currentFeed.editions.length),
  permanent_history:true
};
fs.writeFileSync(path.join(outDir,'history-merge-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
