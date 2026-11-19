// Optional recorded artistic observations. Never an image-admission gate or an
// automatic aesthetic score; missing observations and owner feedback stay unknown.
export const IMAGE_EDITORIAL_FEEDBACK_EFFECTIVE='2026-11-20';
export const IMAGE_EDITORIAL_FEEDBACK_SCHEMA='image-editorial-quality-review-v1';
const date=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const stamp=s=>typeof s==='string'&&/T.+(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const text=(s,n=20)=>typeof s==='string'&&s.trim().length>=n;
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const unique=xs=>new Set(xs).size===xs.length;
const cell=s=>String(s??'Not recorded').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','/').replace(/\r?\n/g,' ');
const empty=status=>({status,reviewed_stories:null,nearest_prior_comparisons:null,owner_feedback:'UNKNOWN',stories:[],artistic_success_not_inferred:true});

export function collectImageEditorialFeedback({edition,aar,manifest}){
 if(!date(edition))return empty('INVALID');
 if(edition<IMAGE_EDITORIAL_FEEDBACK_EFFECTIVE)return empty('NOT_APPLICABLE');
 const r=aar?.editorial_quality_review;
 if(!r)return empty('NOT_RECORDED');
 const bad=()=>empty('INVALID');
 const images=manifest?.images;
 if(aar?.edition_date!==edition||manifest?.edition_date!==edition||
    !hex(aar.job_sha256)||aar.job_sha256!==manifest.job_sha256||
    r.schema_version!==IMAGE_EDITORIAL_FEEDBACK_SCHEMA||r.edition_date!==edition||
    r.method!=='saved_png_fullsize_320_and_set_review'||!stamp(r.reviewed_at)||!text(r.reviewer,3)||
    !text(r.set_observation,60)||!https(r.evidence_ref)||
    !Array.isArray(images)||images.length!==6||!unique(images.map(i=>i?.story_id))||
    images.some(i=>!text(i?.story_id,3)||!hex(i.sha256))||
    !Array.isArray(r.stories)||r.stories.length!==6||!unique(r.stories.map(i=>i?.story_id))||
    !Array.isArray(r.reference_editions)||r.reference_editions.length>7||
    !unique(r.reference_editions)||r.reference_editions.some(d=>!date(d)||d>=edition))return bad();
 const states=['improved','needs_revision','inconclusive'];
 for(const row of r.stories){
  const image=images.find(i=>i.story_id===row?.story_id);
  if(!image||row.sha256!==image.sha256||row.fullsize_pixels_inspected!==true||row.mobile_320_pixels_inspected!==true||
     !states.includes(row.assessment)||!https(row.evidence_ref)||
     ['detail_observation','text_architecture_observation','mobile_observation'].some(k=>!text(row[k],35)))return bad();
  // These source references document the reviewer's evidence; this code does not
  // read a primary source or certify that a depicted relationship is factual.
  for(const key of ['supported_substages','secondary_relationships']){
   const parts=row[key];
   if(!Array.isArray(parts)||parts.length<2||parts.some(p=>!text(p?.description)||!text(p.support_claim_id,3))||
      !unique(parts.map(p=>p.description.trim())))return bad();
  }
  if(row.nearest_prior!==null){
   const n=row.nearest_prior;
   if(!n||!r.reference_editions.includes(n.edition_date)||!text(n.story_id,3)||!hex(n.asset_sha256)||
      !https(n.asset_ref)||n.comparison_basis!=='actual_saved_pixels'||!text(n.observed_difference,60))return bad();
  }
 }
 const feedback=r.owner_feedback;
 if(!feedback||!['unknown','positive','mixed','negative'].includes(feedback.state)||
    (feedback.state!=='unknown'&&(!https(feedback.evidence_ref)||!text(feedback.note))))return bad();
 return {status:r.stories.every(s=>s.nearest_prior!==null)?'RECORDED':'PARTIAL',
  reviewed_stories:6,nearest_prior_comparisons:r.stories.filter(s=>s.nearest_prior!==null).length,
  reviewed_at:r.reviewed_at,reviewer:r.reviewer,reference_editions:[...r.reference_editions],
  owner_feedback:feedback.state.toUpperCase(),owner_feedback_evidence:feedback.state==='unknown'?null:feedback.evidence_ref,
  set_observation:r.set_observation,evidence_ref:r.evidence_ref,
  stories:r.stories.map(s=>({...s})),artistic_success_not_inferred:true,
  source_support_independently_verified:false};
}

export function renderImageEditorialFeedback(review){
 if(!review||review.status==='NOT_APPLICABLE')return '';
 return ['### Useful image detail and recent artwork comparisons','',
  `Review evidence: **${cell(review.status)}**. Stories reviewed: ${cell(review.reviewed_stories)}; exact earlier-image comparisons: ${cell(review.nearest_prior_comparisons)}. Owner feedback: **${cell(review.owner_feedback)}**.`,
  '', '| Story | Useful internal detail | Text architecture | Closest earlier image | Recorded assessment |',
  '|---|---|---|---|---|',
  ...review.stories.map(r=>`| ${cell(r.story_id)} | ${cell(r.detail_observation)} | ${cell(r.text_architecture_observation)} | ${r.nearest_prior?cell(r.nearest_prior.edition_date+' / '+r.nearest_prior.story_id+': '+r.nearest_prior.observed_difference):'Not recorded'} | ${cell(r.assessment)} |`),
  '', ...(review.set_observation?[cell(review.set_observation),'']:[]),
  'These are source-bound reviewer observations, not computer-vision scores, an independent source audit or owner artwork approval. Missing evidence remains unknown. See the original image AAR for exact PNG hashes, source-claim references, mobile notes and prior-image links.',''].join('\n');
}
