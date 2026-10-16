import test from 'node:test';
import assert from 'node:assert/strict';
import {patchPremiumStoryPreview} from '../compiler/premium-social-preview.mjs';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const date='2026-10-16';
const page=BASE+'stories/'+date+'/example-premium/';
const pending=BASE+'briefs/images/'+date+'/illustration-pending.svg?v=fe54b845623b';
const premium=BASE+'briefs/images/'+date+'/dab-edition-'+date+'-m01.png?v=abcdef012345';
const alt='Reviewed figure showing evidence & review';
const markup=({og=pending,twitter=pending,json=pending,canonical=page,visible=premium,duplicate=false}={})=>
  '<head><link rel="canonical" href="'+canonical+'" />\n'+
  '<meta property="og:image" content="'+og+'" />\n'+
  '<meta property="twitter:image" content="'+twitter+'" />\n'+
  (duplicate?'<meta property="og:image" content="'+og+'" />\n':'')+
  '<script type="application/ld+json">\n'+JSON.stringify({'@context':'https://schema.org','@type':'WebPage',image:json,url:page})+'</script></head>'+
  '<main><h1>Do not edit this article</h1><img src="'+visible+'" alt="Reviewed figure showing evidence &amp; review" /></main>';
const patch=html=>patchPremiumStoryPreview(html,{permanentUrl:page,imageUrl:premium,imageAlt:alt});
test('replace exactly three social-image fields while preserving visible pixels, body, canonical and title',()=>{
  const before=markup(),next=patch(before);
  assert.equal(next.fields_changed,3);
  assert.equal(next.original_image_url,pending);
  assert.equal((next.html.match(/dab-edition-2026-10-16-m01.png/g)||[]).length,4);
  assert.equal(next.html.split(pending).length,1);
  assert.equal(next.html.slice(next.html.indexOf('<main>')),before.slice(before.indexOf('<main>')));
  assert.equal(patchPremiumStoryPreview===undefined,false);
  assert.throws(()=>patch(next.html),/unexpected_prior_og:image/);
});
test('reject missing, duplicate, wrong article or wrong accepted image identities',()=>{
  assert.throws(()=>patch(markup({duplicate:true})),/missing_or_duplicate_og:image/);
  assert.throws(()=>patch(markup({canonical:BASE+'stories/'+date+'/wrong/'})),/incorrect_article_canonical/);
  assert.throws(()=>patch(markup({visible:pending})),/reviewed_visible_image_pairing_required/);
  assert.throws(()=>patch(markup({json:premium})),/structured_data_identity_or_prior_image_mismatch/);
  assert.throws(()=>patch(markup({twitter:premium})),/unexpected_prior_twitter:image/);
  assert.throws(()=>patchPremiumStoryPreview(markup(),{permanentUrl:page,
    imageUrl:BASE+'briefs/images/2026-10-15/dab-edition-2026-10-15-m01.png?v=abcdef012345',imageAlt:alt}),/untrusted_premium_image_url/);
});
