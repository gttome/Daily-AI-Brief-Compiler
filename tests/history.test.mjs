import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {mergeShadowHistory} from '../scripts/merge-shadow-history.mjs';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';

const put=(root,relative,value)=>{const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
function hashes(root){
  const result={};
  const walk=(dir,prefix='')=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const relative=prefix+entry.name,file=path.join(dir,entry.name);
      if(entry.isDirectory())walk(file,relative+'/');else result[relative]=sha256(fs.readFileSync(file));
    }
  };walk(root);return result;
}

test('history merge preserves only missing prior permanent pages and never rewrites canonical current reader surfaces',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-history-'));
  const history=path.join(root,'history'),current=path.join(root,'current'),out=path.join(root,'out'),receipt=path.join(root,'receipt.json');

  fs.mkdirSync(path.join(history,'briefs','2026-10-06'),{recursive:true});
  fs.mkdirSync(path.join(history,'stories','2026-10-06','old-story'),{recursive:true});
  fs.mkdirSync(path.join(history,'archive'),{recursive:true});
  fs.writeFileSync(path.join(history,'briefs','2026-10-06','index.html'),'<html>old edition</html>');
  fs.writeFileSync(path.join(history,'stories','2026-10-06','old-story','index.html'),'<html>old story</html>');
  fs.writeFileSync(path.join(history,'archive','index.html'),'<html>legacy custom archive</html>');

  fs.mkdirSync(path.join(current,'briefs','2026-10-07'),{recursive:true});
  fs.mkdirSync(path.join(current,'stories','2026-10-07','new-story'),{recursive:true});
  fs.mkdirSync(path.join(current,'briefs-archive'),{recursive:true});
  fs.writeFileSync(path.join(current,'index.html'),'<html>canonical latest</html>');
  fs.writeFileSync(path.join(current,'briefs','2026-10-07','index.html'),'<html>new edition</html>');
  fs.writeFileSync(path.join(current,'stories','2026-10-07','new-story','index.html'),'<html>new story</html>');
  fs.writeFileSync(path.join(current,'briefs-archive','index.html'),'<html>canonical archive</html>');
  fs.writeFileSync(path.join(current,'feed.json'),'{"version":"https://jsonfeed.org/version/1.1","items":[]}');

  execFileSync(process.execPath,['scripts/merge-shadow-history.mjs',history,current,out,'2026-10-07',receipt]);
  assert.ok(fs.existsSync(path.join(out,'briefs','2026-10-06','index.html')));
  assert.ok(fs.existsSync(path.join(out,'stories','2026-10-06','old-story','index.html')));
  assert.ok(fs.existsSync(path.join(out,'briefs','2026-10-07','index.html')));
  assert.equal(fs.readFileSync(path.join(out,'briefs-archive','index.html'),'utf8'),'<html>canonical archive</html>');
  assert.equal(fs.readFileSync(path.join(out,'feed.json'),'utf8'),'{"version":"https://jsonfeed.org/version/1.1","items":[]}');
  assert.ok(!fs.existsSync(path.join(out,'archive','index.html')));
  const data=JSON.parse(fs.readFileSync(receipt,'utf8'));
  assert.deepEqual(data.preserved_prior_editions,['2026-10-06']);
  assert.equal(data.archive_and_feeds_rewritten,false);
});

test('I06-T05 historical correction preserves newer home/latest, feedback, feeds, archives and all other editions',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-history-correction-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const history=path.join(root,'history'),current=path.join(root,'current'),out=path.join(root,'out');
  const target='2026-10-06',latest='2026-10-09';
  const currentManifest={schema_version:'daily-compiler-canonical-reader-source-v1',edition_date:target,bundle_sha256:'1'.repeat(64)};
  const newerManifest={...currentManifest,edition_date:latest,bundle_sha256:'9'.repeat(64)};
  const shared=['index.html','latest.md','latest/index.html','feed.json','feed.xml','daily-feed.xml','briefs-archive/index.html','data/archive-index.json','data/compiler-feedback-registry.json','assets/js/feedback.js','assets/js/comments.js','assets/js/share.js','watchlist/index.html','sources/index.html'];
  for(const route of shared){put(history,route,'NEWER READER '+route);put(current,route,'OLDER BUILD MUST NOT REPLACE '+route);}
  put(history,'build-manifest.json',newerManifest);put(current,'build-manifest.json',currentManifest);
  for(const category of ['briefs','stories','videos','podcasts']){
    const suffix=category==='briefs'?'index.html':'permanent-item/index.html';
    put(history,category+'/'+latest+'/'+suffix,'NEWER '+category);
    put(history,category+'/'+target+'/'+suffix,'ORIGINAL '+category);
    put(current,category+'/'+target+'/'+suffix,category==='briefs'||category==='stories'?'CORRECTED '+category:'ORIGINAL '+category);
  }
  put(history,'briefs/images/'+target+'/canonical.png','ORIGINAL ALIAS');
  put(history,'briefs/images/'+target+'/original-immutable.png','ORIGINAL IMMUTABLE ASSET');
  put(history,'briefs/images/'+target+'/unselected.png','UNSELECTED');
  put(history,'briefs/images/'+latest+'/canonical.png','NEWER IMAGE');
  put(current,'briefs/images/'+target+'/canonical.png','APPROVED CORRECTED ALIAS');
  put(current,'briefs/images/'+target+'/correction-version.png','APPROVED VERSIONED ASSET');
  const original=hashes(history),candidate=hashes(current);
  const receipt=mergeShadowHistory({historyDir:history,currentDir:current,outDir:out,currentDate:target});
  const result=hashes(out);
  assert.deepEqual(hashes(history),original,'historical input is immutable');
  assert.deepEqual(hashes(current),candidate,'candidate input is immutable');
  for(const [route,hash] of Object.entries(original)){
    const approvedAliases=['briefs/'+target+'/index.html','stories/'+target+'/permanent-item/index.html','briefs/images/'+target+'/canonical.png'];
    if(!approvedAliases.includes(route))assert.equal(result[route],hash,route);
  }
  for(const route of ['briefs/'+target+'/index.html','stories/'+target+'/permanent-item/index.html','briefs/images/'+target+'/canonical.png','briefs/images/'+target+'/correction-version.png'])assert.equal(result[route],candidate[route],route);
  assert.equal(receipt.current_date,target);assert.equal(receipt.latest_date,latest);
  assert.equal(receipt.historical_correction,true);assert.equal(receipt.homepage_latest_preserved,true);
  assert.equal(receipt.bundle_sha256,currentManifest.bundle_sha256);
  assert.equal(receipt.source_manifest_sha256,canonicalSha(currentManifest));
  assert.ok(receipt.preserved_editions.includes(latest));
  assert.ok(receipt.published_shared_routes.every(row=>row.sha256===original[row.route]));
});

test('I06-T03 later publication retains previously corrected permanent history and old asset versions',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-history-preserve-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const history=path.join(root,'history'),current=path.join(root,'current'),out=path.join(root,'out');
  put(history,'briefs/2026-10-06/index.html','PREVIOUSLY CORRECTED');
  put(history,'stories/2026-10-06/permanent/index.html','CORRECTED PERMANENT STORY');
  put(history,'briefs/images/2026-10-06/original-version.png','ORIGINAL ASSET');
  put(history,'briefs/images/2026-10-06/canonical.png','CORRECTED ALIAS');
  put(history,'briefs/images/2026-10-09/accepted-old-version.png','RETAIN ON SAME-DATE REBUILD');
  put(current,'briefs/2026-10-06/index.html','STALE VENDORED COPY');
  put(current,'stories/2026-10-06/permanent/index.html','STALE VENDORED STORY');
  put(current,'briefs/images/2026-10-06/canonical.png','STALE IMAGE');
  put(current,'briefs/2026-10-09/index.html','NEW EDITION');
  put(current,'index.html','NEW HOME');
  const receipt=mergeShadowHistory({historyDir:history,currentDir:current,outDir:out,currentDate:'2026-10-09'});
  assert.equal(fs.readFileSync(path.join(out,'briefs/2026-10-06/index.html'),'utf8'),'PREVIOUSLY CORRECTED');
  assert.equal(fs.readFileSync(path.join(out,'stories/2026-10-06/permanent/index.html'),'utf8'),'CORRECTED PERMANENT STORY');
  assert.equal(fs.readFileSync(path.join(out,'briefs/images/2026-10-06/canonical.png'),'utf8'),'CORRECTED ALIAS');
  assert.equal(fs.readFileSync(path.join(out,'briefs/images/2026-10-06/original-version.png'),'utf8'),'ORIGINAL ASSET');
  assert.equal(fs.readFileSync(path.join(out,'briefs/images/2026-10-09/accepted-old-version.png'),'utf8'),'RETAIN ON SAME-DATE REBUILD');
  assert.equal(fs.readFileSync(path.join(out,'index.html'),'utf8'),'NEW HOME');
  assert.equal(receipt.historical_correction,false);
});

test('history merge rejects overlapping output and inconsistent current identity before mutation',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-history-reject-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const current=path.join(root,'current');
  put(current,'index.html','UNCHANGED');
  const before=hashes(current);
  assert.throws(()=>mergeShadowHistory({historyDir:'-',currentDir:current,outDir:current,currentDate:'2026-10-06'}),/must be disjoint/);
  assert.deepEqual(hashes(current),before);
  put(current,'build-manifest.json',{edition_date:'2026-10-09'});
  assert.throws(()=>mergeShadowHistory({historyDir:'-',currentDir:current,outDir:path.join(root,'out'),currentDate:'2026-10-06'}),/manifest edition mismatch/);
  assert.equal(fs.existsSync(path.join(root,'out')),false);
});
