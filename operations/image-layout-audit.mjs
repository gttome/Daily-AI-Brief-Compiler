// Labels are observations of the contact sheet, not automated vision or owner approval.
export const LAYOUT_AUDIT_EFFECTIVE='2026-11-26';
export const LAYOUT_FAMILIES=Object.freeze(['horizontal-strip','vertical-stack','central-cutaway',
 'radial-loop','branching-tree','asymmetric-inset','continuous-scene','diagonal-depth','side-by-side']);
const families=new Set(LAYOUT_FAMILIES);
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const date=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s);
const note=s=>typeof s==='string'&&s.trim().length>=20;
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,48}$/.test(s);
const grid=s=>typeof s==='string'&&/^[.DS]{3}\/[.DS]{3}\/[.DS]{3}$/.test(s)&&s.includes('D');
const fail=s=>{throw Error('image_layout_audit:'+s)};
const layoutCounts=(rows,key)=>{
 const counts={};
 for(const row of rows)counts[row[key]]=(counts[row[key]]??0)+1;
 return counts;
};
export function verifyFrozenLayoutPlan(specifications,edition){
 if(edition<LAYOUT_AUDIT_EFFECTIVE)return null;
 const rows=specifications.map(s=>({story_id:s.story_id,...s.pre_generation_checks?.structural_layout_plan}));
 if(rows.length!==6||new Set(rows.map(x=>x.story_id)).size!==6||
  rows.some(x=>!families.has(x.layout_family)||!grid(x.silhouette)))fail('frozen_silhouettes_required');
 const counts=layoutCounts(rows,'layout_family');
 if(Object.keys(counts).length<4||Math.max(...Object.values(counts))>2)fail('frozen_layout_repetition');
 return new Map(rows.map(x=>[x.story_id,x]));
}
export function verifyImageLayoutAudit(manifest,{index,specifications}={}){
 const edition=manifest?.edition_date;
 if(!date(edition))fail('edition_date');
 if(edition<LAYOUT_AUDIT_EFFECTIVE)return null;
 const diversity=manifest.set_review?.editorial_diversity;
 const a=manifest.set_review?.structural_layout_review;
 const images=new Map((manifest.images??[]).map(i=>[i.story_id,i.sha256]));
 if(a?.schema_version!=='image-structural-layout-review-v1'||a.method!=='unlabeled_silhouette_and_saved_thumbnail'||
    a.contact_sheet_sha256!==diversity?.contact_sheet_sha256||!hex(a.contact_sheet_sha256)||
    !Array.isArray(a.stories)||a.stories.length!==6||images.size!==6||new Set(a.stories.map(x=>x.story_id)).size!==6||
    !Array.isArray(a.prior_sets)||a.prior_sets.length>3)fail('missing_hash_bound_silhouette_review');
 const dates=a.prior_sets.map(x=>x.edition_date);
 if(a.prior_sets.some((x,i)=>!date(x.edition_date)||x.edition_date>=edition||i>0&&x.edition_date>=dates[i-1]||
    !Array.isArray(x.images)||x.images.length!==6||new Set(x.images.map(y=>y.sha256)).size!==6||
    x.images.some(y=>!hex(y.sha256)||!families.has(y.layout_family)||!slug(y.treatment))||
    typeof x.evidence_url!=='string'||!/^https:\/\/(github\.com\/gttome\/Daily-AI-Brief-Compiler\/|gttome\.github\.io\/Daily-AI-Brief-Compiler\/)/.test(x.evidence_url)))fail('invalid_prior_set_evidence');
 if(index){
  const expected=[...new Set((index.editions??[]).filter(x=>x.status==='RELEASED_VERIFIED'&&date(x.edition_date)&&x.edition_date<edition)
   .map(x=>x.edition_date))].sort().reverse().slice(0,3);
  if(JSON.stringify(expected)!==JSON.stringify(dates))fail('must_compare_latest_verified_editions');
 }
 const frozen=specifications?verifyFrozenLayoutPlan(specifications,edition):null;
 let changed=0;
 for(const x of a.stories){
  if(!hex(x.sha256)||images.get(x.story_id)!==x.sha256||!families.has(x.planned_layout)||!families.has(x.observed_layout)||
     !grid(x.planned_silhouette)||!grid(x.observed_silhouette)||!slug(x.observed_treatment)||
     !note(x.observed_grouping)||!note(x.observed_eye_path)||!Array.isArray(x.prior_matches)||x.prior_matches.length!==dates.length)
     fail('missing_observed_pixels_or_hash_binding:'+x.story_id);
  if(frozen&&(frozen.get(x.story_id)?.layout_family!==x.planned_layout||
    frozen.get(x.story_id)?.silhouette!==x.planned_silhouette))fail('review_disagrees_with_frozen_silhouette:'+x.story_id);
  let revised=false;
  for(const [i,m] of x.prior_matches.entries()){
   const prior=a.prior_sets[i];
   const nearest=prior.images.find(y=>y.sha256===m.image_sha256);
   if(m.edition_date!==prior.edition_date||!nearest||!note(m.visual_comparison))fail('missing_evidenced_nearest_prior_match:'+x.story_id);
   if(i===0)revised=x.observed_layout!==nearest.layout_family&&x.observed_treatment!==nearest.treatment;
  }
  if(revised)changed++;
 }
 const planned=layoutCounts(a.stories,'planned_layout');
 const observed=layoutCounts(a.stories,'observed_layout');
 for(const [label,counts] of [['planned',planned],['observed',observed]]){
  if(Object.keys(counts).length<4||Math.max(...Object.values(counts))>2)fail(label+'_layout_repetition');
 }
 if(dates.length){
  const preceding=layoutCounts(a.prior_sets[0].images,'layout_family');
  if(LAYOUT_FAMILIES.every(k=>(observed[k]??0)===(preceding[k]??0)))fail('preceding_edition_layout_mix_repeated');
  if(changed<3)fail('fewer_than_three_changed_layout_and_treatment_combinations');
 }
 return {planned,observed,largest_repeated_layout:Math.max(...Object.values(observed)),prior_editions:dates,
  changed_vs_preceding:dates.length?changed:null,stories:a.stories};
}
