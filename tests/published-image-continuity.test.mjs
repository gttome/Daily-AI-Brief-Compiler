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
function make(edition=date){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'image-preservation-'));
  const old=path.join(root,'old'),newSite=path.join(root,'new');
  const images=[],stories=[],tags=[];
  for(const slot of ['m01','m02','m10','m11','m12','m14']){
    const id='test-'+slot,route='briefs/images/'+edition+'/dab-edition-'+edition+'-'+slot+'.png';
    const bytes=Buffer.alloc(200,parseInt(slot.slice(1),10)+17);
    const digest=sha(bytes),url=BASE+route+'?v='+digest.slice(0,12);
    images.push({story_id:id,route,sha256:digest,bytes:bytes.length});
    stories.push({story_id:id,permanent_url:BASE+'stories/'+edition+'/test-'+slot+'/',
      complete_compiler_story:{headline:'Test '+slot}});
    const img='<img src="'+url+'" alt="Verified accepted image" />';
    tags.push(img);
    put(old,route,bytes);
    put(old,'stories/'+edition+'/test-'+slot+'/index.html','<html>'+img+'</html>');
  }
  put(old,'briefs/'+edition+'/index.html','<html>'+tags.join('')+'</html>');
  put(old,'image-jobs/index.json',JSON.stringify({
    schema_version:'external-compiler-image-index-v1',
    editions:[{edition_date:edition,status:'RELEASED_VERIFIED',job_sha256:'a'.repeat(64)}]
  }));
  put(old,'image-jobs/'+edition+'/job.json',JSON.stringify({stories}));
  put(old,'image-jobs/'+edition+'/release.json',JSON.stringify({
    result:'RELEASED_VERIFIED',edition_date:edition,images
  }));
  fs.cpSync(old,newSite,{recursive:true});
  return {root,old,newSite,edition,images,stories};
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
test('owner-approved versioned November 18 revision becomes the protected page pairing',()=>{
  const f=make('2026-11-18');
  try{
    const slots=['m01','m02','m10','m11','m12','m14'];
    const revised=f.images.map((image,index)=>{
      const bytes=Buffer.alloc(220,index+91);
      return {...image,
        route:`briefs/images/${f.edition}/owner-quality-r2/dab-edition-${f.edition}-${slots[index]}.png`,
        sha256:sha(bytes),bytes:bytes.length,_bytes:bytes};
    });
    for(const root of [f.old,f.newSite]){
      for(const image of revised)put(root,image.route,image._bytes);
      const publicImages=revised.map(({_bytes,...image})=>image);
      put(root,`image-revisions/${f.edition}/owner-quality-r2/release.json`,JSON.stringify({
        schema_version:'owner-nov18-image-revision-release-v1',edition_date:f.edition,
        revision_id:'owner-quality-r2',result:'LIVE_HASH_AND_24_CAPTURES_VERIFIED',
        original_accepted_images_preserved:true,original_release_receipt_preserved:true,
        original_bundle_unchanged:true,owner_requested:true,images:publicImages
      }));
      for(let i=0;i<f.stories.length;i++){
        const oldUrl=BASE+f.images[i].route+'?v='+f.images[i].sha256.slice(0,12);
        const newUrl=BASE+revised[i].route+'?v='+revised[i].sha256.slice(0,12);
        for(const page of [
          `briefs/${f.edition}/index.html`,
          `stories/${f.edition}/test-${slots[i]}/index.html`
        ]){
          const file=path.join(root,page);
          fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(oldUrl,newUrl));
        }
      }
    }
    assert.equal(check(f).result,'PASS');
    put(f.newSite,revised[0].route,Buffer.alloc(220,0));
    assert.throws(()=>check(f),/accepted_image_revision_bytes_changed/);
  }finally{clean(f);}
});
test('owner-approved mixed November 25 revision preserves retained and replacement pairings',()=>{
  const f=make('2026-11-25');
  try{
    const replacedIds=new Set(['test-m10','test-m12','test-m14']);
    const revised=f.images.map((image,index)=>{
      const replaced=replacedIds.has(image.story_id),bytes=Buffer.alloc(230,index+101);
      return replaced?{...image,
        route:`briefs/images/${f.edition}/owner-layout-r2/dab-edition-${f.edition}-${f.stories[index].story_id.slice(-3)}.png`,
        sha256:sha(bytes),bytes:bytes.length,replaced:true,old_sha256:image.sha256,_bytes:bytes}:
        {...image,replaced:false,old_sha256:image.sha256,_bytes:null};
    });
    const expectedIds=['nov25-a1-agentic-eval-chain','nov25-g1-workspace-mcp','nov25-g2-switchcraft-routing'];
    for(const [row,id] of revised.filter(x=>x.replaced).map((x,i)=>[x,expectedIds[i]])){
      const oldId=row.story_id;
      row.story_id=id;
      const story=f.stories.find(x=>x.story_id===oldId);
      story.story_id=id;
      f.images.find(x=>x.story_id===oldId).story_id=id;
    }
    for(const root of [f.old,f.newSite]){
      put(root,`image-jobs/${f.edition}/job.json`,JSON.stringify({stories:f.stories}));
      put(root,`image-jobs/${f.edition}/release.json`,JSON.stringify({
        result:'RELEASED_VERIFIED',edition_date:f.edition,images:f.images
      }));
      for(const image of revised.filter(x=>x.replaced))put(root,image.route,image._bytes);
      put(root,`image-revisions/${f.edition}/owner-layout-r2/release.json`,JSON.stringify({
        schema_version:'owner-nov25-image-revision-release-v1',edition_date:f.edition,
        revision_id:'owner-layout-r2',result:'LIVE_HASH_AND_24_CAPTURES_VERIFIED',
        original_accepted_images_preserved:true,original_release_receipt_preserved:true,
        original_bundle_unchanged:true,owner_requested:true,
        images:revised.map(({_bytes,...image})=>image)
      }));
      for(let i=0;i<revised.length;i++){
        if(!revised[i].replaced)continue;
        const oldUrl=BASE+f.images[i].route+'?v='+f.images[i].sha256.slice(0,12);
        const newUrl=BASE+revised[i].route+'?v='+revised[i].sha256.slice(0,12);
        const permanent=new URL(f.stories[i].permanent_url).pathname.replace('/Daily-AI-Brief-Compiler/','')+'index.html';
        for(const page of [`briefs/${f.edition}/index.html`,permanent]){
          const file=path.join(root,page);
          fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(oldUrl,newUrl));
        }
      }
    }
    assert.equal(check(f).result,'PASS');
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
