// Prospective six-image saved-pixel diversity evidence, distinct from individual QA.
// These fields are reviewer observations, not computer vision or owner sign-off.
// Historical released image packages are immutable.
export const EDITORIAL_DIVERSITY_EFFECTIVE='2026-11-16';
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const note=(s,min=20)=>typeof s==='string'&&s.trim().length>=min;
const fail=s=>{throw Error('image_editorial_diversity:'+s);};
const value=s=>typeof s==='string'?s.trim().toLowerCase():null;
const unique=(rows,key)=>new Set(rows.map(row=>value(row[key]))).size;
const validTime=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(s)&&Number.isFinite(Date.parse(s));
export function verifyEditorialDiversityEvidence(manifest){
  const edition=manifest?.edition_date;
  if(typeof edition!=='string')fail('edition_missing');
  if(edition<EDITORIAL_DIVERSITY_EFFECTIVE)return {required:false,status:'HISTORICAL_PACKAGE_UNCHANGED'};
  const images=manifest.images;
  if(!Array.isArray(images)||images.length!==6)fail('exactly_six_images_required');
  const imageMap=new Map(images.map(x=>[x.story_id,x.sha256]));
  if(imageMap.size!==6||[...imageMap.values()].some(s=>!hex(s)))fail('six_unique_source_bound_images_required');
  const r=manifest.set_review?.editorial_diversity;
  if(r?.schema_version!=='external-image-editorial-diversity-v1'||r.status!=='PASS'||
    r.method!=='six_up_saved_png_pixel_comparison'||r.source!=='saved_committed_png_pixels'||
    r.owner_acceptance_not_inferred!==true||!validTime(r.reviewed_at)||
    !note(r.reviewer,3)||!Array.isArray(r.reviewed_sha256s)||r.reviewed_sha256s.length!==6||
    new Set(r.reviewed_sha256s).size!==6||
    r.reviewed_sha256s.some(s=>![...imageMap.values()].includes(s)))
      fail('independent_six_up_review_and_exact_hash_bindings_required');
  const prefix='external-image-packages/'+edition+'/reviews/';
  if(r.contact_sheet_path!==prefix+'six-up-contact-sheet.png'||!hex(r.contact_sheet_sha256))
    fail('hashed_six_up_contact_sheet_required');
  const rows=r.stories;
  if(!Array.isArray(rows)||rows.length!==6||new Set(rows.map(x=>x.story_id)).size!==6)
    fail('six_individual_visual_observations_required');
  for(const x of rows){
    if(imageMap.get(x.story_id)!==x.sha256||
      ['visual_thesis','format_family','dominant_grammar','medium_treatment','mechanism_metaphor',
       'perspective','information_hierarchy','palette_family','dominant_arrangement'].some(k=>!note(x[k],3))||
      !note(x.observed_distinctiveness,60)||!note(x.first_pass_risk_preflight,45))
      fail('unbound_or_generic_story_visual_observation:'+String(x?.story_id));
    const sig=images.find(i=>i.story_id===x.story_id)?.visual_signature;
    if(sig?.grammar&&value(sig.grammar)!==value(x.dominant_grammar))
      fail('manifest_visual_signature_conflicts_with_observed_grammar:'+x.story_id);
  }
  const mins={format_family:4,dominant_grammar:4,medium_treatment:4,
    mechanism_metaphor:4,information_hierarchy:4,palette_family:4,perspective:3};
  for(const [key,min] of Object.entries(mins)){
    if(unique(rows,key)<min)fail('insufficient_observed_variety_'+key);
  }
  if(rows.filter(x=>value(x.dominant_arrangement)==='input_engine_output').length>2)
    fail('repeated_input_engine_output_template');
  const pairs=r.pairwise;
  if(!Array.isArray(pairs)||pairs.length!==15)fail('all_fifteen_visual_pairs_required');
  const observed=new Set(),ids=[...imageMap.keys()].sort();
  for(const p of pairs){
    if(!imageMap.has(p?.left_story_id)||!imageMap.has(p?.right_story_id)||
       p.left_story_id===p.right_story_id||p.same_dominant_template!==false||
       !note(p.observed_pixel_difference,60)||!note(p.shared_traits,15))
       fail('pairwise_comparison_incomplete_or_similar');
    const key=[p.left_story_id,p.right_story_id].sort().join('|');
    if(observed.has(key))fail('duplicate_visual_pair'); observed.add(key);
  }
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)
    if(!observed.has(ids[i]+'|'+ids[j]))fail('missing_visual_pair');
  return {required:true,status:'DIVERSITY_EVIDENCE_RECORDED_NOT_OWNER_ART_APPROVAL',
    contact_sheet_path:r.contact_sheet_path,contact_sheet_sha256:r.contact_sheet_sha256,
    distinct_format_families:unique(rows,'format_family'),pairwise_reviews:observed.size};
}
