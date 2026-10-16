import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {correctPremiumSocialPreviews} from '../scripts/correct-premium-social-previews.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const date='2026-10-16';
const slots=['m01','m02','m10','m11','m12','m14'];
const categories=['Technical AI Engineering','Technical AI Engineering',
  'Applied Generative AI for Knowledge Workers','Applied Generative AI for Knowledge Workers',
  'Agents for Everyone','Agents for Everyone'];
const pending=BASE+'briefs/images/'+date+'/illustration-pending.svg?v=fe54b845623b';
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'premium-social-preview-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const historyRoot=path.join(root,'history'),outputRoot=path.join(root,'patched');
  fs.mkdirSync(historyRoot,{recursive:true});
  const stories=[],images=[],manifestImages=[];
  for(let i=0;i<6;i++){
    const id='test-story-'+i,article='stories/'+date+'/story-'+i+'/',permanentUrl=BASE+article;
    const bytes=Buffer.from('CANONICAL_PREMIUM_IMAGE_'+id);
    const png='briefs/images/'+date+'/dab-edition-'+date+'-'+slots[i]+'.png',hash=sha(bytes);
    const url=BASE+png+'?v='+hash.slice(0,12);
    const alt='Reviewed figure '+i+' showing allowed activities';
    stories.push({story_id:id,permanent_url:permanentUrl,
      complete_compiler_story:{id,headline:'Example '+i,focus:categories[i]}});
    images.push({story_id:id,route:png,sha256:hash,bytes:bytes.length});
    manifestImages.push({story_id:id,sha256:hash,bytes:bytes.length,alt_text:alt,
      accepted_locked:true,visual_review:{inspected_png_sha256:hash}});
    const imagePath=path.join(historyRoot,png);
    fs.mkdirSync(path.dirname(imagePath),{recursive:true});
    fs.writeFileSync(imagePath,bytes);
    const html='<html><head><link rel="canonical" href="'+permanentUrl+'" />'+
      '<meta property="og:image" content="'+pending+'" />'+
      '<meta property="twitter:image" content="'+pending+'" />'+
      '<script type="application/ld+json">'+JSON.stringify({
        '@context':'https://schema.org','@type':'WebPage',url:permanentUrl,image:pending
      })+'</script></head><body><article>Protected body '+id+
      '</article><img src="'+url+'" alt="'+alt+'" /></body></html>';
    const htmlPath=path.join(historyRoot,article,'index.html');
    fs.mkdirSync(path.dirname(htmlPath),{recursive:true});
    fs.writeFileSync(htmlPath,html);
  }
  fs.mkdirSync(path.join(historyRoot,'data'),{recursive:true});
  fs.writeFileSync(path.join(historyRoot,'data','watchlist.json'),'{"topics":[{"topic_id":"preserved"}]}\n');
  const job={schema_version:'external-compiler-image-job-v1',edition_date:date,
    source:{bundle_sha256:'a'.repeat(64)},stories};
  const jobBytes=Buffer.from(JSON.stringify(job));
  const index={schema_version:'external-compiler-image-index-v1',
    editions:[{edition_date:date,status:'RELEASED_VERIFIED'}]};
  const release={schema_version:'external-compiler-image-release-v1',result:'RELEASED_VERIFIED',
    edition_date:date,immutable_job_sha256:sha(jobBytes),original_bundle_sha256:job.source.bundle_sha256,
    images};
  const manifest={schema_version:'external-compiler-image-package-v1',edition_date:date,
    job_sha256:sha(jobBytes),images:manifestImages};
  const revision={schema_version:'daily-compiler-premium-social-preview-correction-v1',
    requested_by:'owner',correction_type:'PREMIUM_SOCIAL_PREVIEW_ONLY',edition_date:date,
    expected_image_count:6,expected_history_head:'a'.repeat(40)};
  return {root,historyRoot,outputRoot,jobBytes,index,release,manifest,revision,images};
}
test('one correction edits exactly six story previews, all 18 metadata fields; images, bodies, Watchlist stay byte-identical',t=>{
  const p=fixture(t);
  const receipt=correctPremiumSocialPreviews(p);
  assert.equal(receipt.result,'PASS');
  assert.equal(receipt.html_pages_changed,6);
  assert.equal(receipt.preview_fields_changed,18);
  assert.equal(receipt.accepted_images_preserved,6);
  assert.equal(receipt.accepted_image_regenerations,0);
  for(const row of receipt.changed){
    const prior=fs.readFileSync(path.join(p.historyRoot,row.route),'utf8');
    const fixed=fs.readFileSync(path.join(p.outputRoot,row.route),'utf8');
    assert.equal((prior.match(/illustration-pending.svg/g)||[]).length,3);
    assert.equal((fixed.match(/illustration-pending.svg/g)||[]).length,0);
    assert.equal((fixed.match(/dab-edition-2026-10-16-m\d\d.png/g)||[]).length,4);
    assert.equal(prior.slice(prior.indexOf('<body>')),fixed.slice(fixed.indexOf('<body>')));
    assert.notEqual(row.original_sha256,row.current_sha256);
  }
  for(const image of p.images){
    const source=fs.readFileSync(path.join(p.historyRoot,image.route));
    const target=fs.readFileSync(path.join(p.outputRoot,image.route));
    assert.ok(source.equals(target));
    assert.equal(sha(target),image.sha256);
  }
  assert.ok(fs.readFileSync(path.join(p.outputRoot,'data/watchlist.json')).equals(
    fs.readFileSync(path.join(p.historyRoot,'data/watchlist.json'))));
  assert.throws(()=>correctPremiumSocialPreviews({...p,historyRoot:p.outputRoot,
    outputRoot:path.join(p.root,'second')}),/unexpected_prior_og:image/);
});
test('wrong revision and tampered accepted image bytes fail before staging',t=>{
  const p=fixture(t);
  assert.throws(()=>correctPremiumSocialPreviews({...p,revision:{...p.revision,edition_date:'2026-10-17'}}),
    /unapproved_revision_scope/);
  fs.writeFileSync(path.join(p.historyRoot,p.images[0].route),Buffer.from('corrupted'));
  assert.throws(()=>correctPremiumSocialPreviews(p),/accepted_premium_bytes_drift/);
  assert.equal(fs.existsSync(p.outputRoot),false);
});
