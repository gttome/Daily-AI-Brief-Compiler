import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {assertPublishedImageContinuity} from '../scripts/assert-published-image-continuity.mjs';

const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const date='2026-10-16';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const put=(root,p,bytes)=>{
  const file=path.join(root,p);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,bytes);
};
function make(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'image-preservation-'));
  const old=path.join(root,'old'),newSite=path.join(root,'new');
  const images=[],stories=[],tags=[];
  for(const slot of ['m01','m02','m10','m11','m12','m14']){
    const id='test-'+slot,route='briefs/images/'+date+'/dab-edition-'+date+'-'+slot+'.png';
    const bytes=Buffer.alloc(200,parseInt(slot.slice(1),10)+17);
    const digest=sha(bytes),url=BASE+route+'?v='+digest.slice(0,12);
    images.push({story_id:id,route,sha256:digest,bytes:bytes.length});
    stories.push({story_id:id,permanent_url:BASE+'stories/'+date+'/test-'+slot+'/',
      complete_compiler_story:{headline:'Test '+slot}});
    const img='<img src="'+url+'" alt="Verified accepted image" />';
    tags.push(img);
    put(old,route,bytes);
    put(old,'stories/'+date+'/test-'+slot+'/index.html','<html>'+img+'</html>');
  }
  put(old,'briefs/'+date+'/index.html','<html>'+tags.join('')+'</html>');
  put(old,'image-jobs/index.json',JSON.stringify({
    schema_version:'external-compiler-image-index-v1',
    editions:[{edition_date:date,status:'RELEASED_VERIFIED',job_sha256:'a'.repeat(64)}]
  }));
  put(old,'image-jobs/'+date+'/job.json',JSON.stringify({stories}));
  put(old,'image-jobs/'+date+'/release.json',JSON.stringify({
    result:'RELEASED_VERIFIED',edition_date:date,images
  }));
  fs.cpSync(old,newSite,{recursive:true});
  return {root,old,newSite};
}
const check=f=>assertPublishedImageContinuity({historyRoot:f.old,candidateRoot:f.newSite});
const clean=f=>fs.rmSync(f.root,{recursive:true,force:true});
test('all six prior image bytes and twelve article pairings survive unchanged',()=>{
  const f=make();
  try{
    const verified=check(f);
    assert.equal(verified.result,'PASS');
    assert.equal(verified.accepted_images,6);
    assert.equal(verified.article_image_pairings,12);
  }finally{clean(f);}
});
test('a Pages build with stale placeholders fails closed',()=>{
  const f=make();
  try{
    put(f.newSite,'briefs/'+date+'/index.html','<html><img src="illustration-pending.svg" /></html>');
    assert.throws(()=>check(f),/accepted_story_image_pairing_lost/);
  }finally{clean(f);}
});
test('missing PNG, altered accepted bytes, lost receipt, and missing index block deployment',()=>{
  const scenarios=[
    f=>fs.rmSync(path.join(f.newSite,'briefs/images',date,'dab-edition-'+date+'-m01.png')),
    f=>put(f.newSite,'briefs/images/'+date+'/dab-edition-'+date+'-m01.png',Buffer.alloc(200,0)),
    f=>fs.rmSync(path.join(f.newSite,'image-jobs',date,'release.json')),
    f=>put(f.newSite,'image-jobs/index.json',
      JSON.stringify({schema_version:'external-compiler-image-index-v1',editions:[]}))
  ];
  for(const damage of scenarios){
    const f=make();
    try{
      damage(f);
      assert.throws(()=>check(f),/published_image_continuity:/);
    }finally{clean(f);}
  }
});
