// Prospective planning checks only. Native output still requires real pixel review.
import crypto from 'node:crypto';
export const IMAGE_LAYOUT_REQUIREMENTS=Object.freeze({
  width:1200,height:630,safe_margin_px:40,priority_font_px:36,
  secondary_font_px:28,effective_date:'2026-11-01'
});
// Closed compatibility set: these six specifications were accepted on main
// before this gate shipped (PR301, eff5573cc39ce6c47bdd582e4aa9350e5ac09d92).
// SHA-256 covers JSON.stringify of the ENTIRE parsed specification, including
// edition, source, story and all review fields. Never derive this allowlist from
// mutable package files at runtime. This exempts only the new geometry check;
// all existing source/label/semantic and package admission checks still apply.
// Nov02 six accepted specs: protected main a6142df; exact whole-spec hashes only.
const ACCEPTED_PREACTIVATION_SPEC_SHA256=Object.freeze({
  'nov02-t1-nemotron-haunted-house-pipeline':'6970800414f44edb2e948e8b1638ad45b67223e9adfd73962a5f130d36422b35',
  'nov02-t2-behavioral-evals-after-provenance':'6e0316a5bb33138608ed8c68345ef0d3c347d226e21bd03f29dc1230a2689020',
  'nov02-k1-protostar-ai-ready-science':'85c5f5b2a712218aaf8563237bd55d08f5972c1e1da209cbb0e6cc06b84cc1b4',
  'nov02-k2-gemini-inline-file-editing':'93ad2863dd278af97e9ac41717b64beeb228d3e139389765b1d9bc1b0f3ed0ba',
  'nov02-a1-governed-onboarding-case-context':'c36f9c4750ef5b05844d21d0f042eb976bd99569923c2ff07dded0829801c171',
  'nov02-a2-article-recommendation-audit-skill':'c61d70fa969bf8b1a8c19bfa16b7ed16f8817a9b3cd63700a99bd40fef64d476',
  'nov01-t1-dynamo-validated-kubernetes-runtime':'181b83842fd79f9959605d3e7a02602486e1fd1f251bb6dc5740857a1d452ea0',
  'nov01-t2-frontier-misalignment-monitoring':'879a87a06aed02527d79be928084f2a1b81eb8483c2d04b7e6952a752074da7d',
  'nov01-k1-gemini-whole-deck-edits':'33b8c95ce8191ca073334054d7f344d9cb56d4239601e1735d5625a233fa9609',
  'nov01-k2-cited-financial-research-assistant':'be5569dc57e041cd7f3b8994597fc17d25c0aaaa589bcf47c0a995c441a14e07',
  'nov01-a1-browser-handoff-async-agents':'82b7f0e6fff4a0d44b6ca5771ccc6badc1647a710cc43ad0b2841ece131422a7',
  'nov01-a2-commitments-tally-skill':'b23c17f8d1b46ffa2fce1b280fc417e6fb21a53d523e02b5d2759f4b2166e98b',
});
function isAcceptedPreActivationSpecification(spec){
 return ['2026-11-01','2026-11-02'].includes(spec.edition_date)&&
  ACCEPTED_PREACTIVATION_SPEC_SHA256[spec.story_id]===crypto.createHash('sha256')
   .update(JSON.stringify(spec)).digest('hex');
}
const fail=message=>{throw Error('image_composition_geometry:'+message);};
const text=value=>typeof value==='string'&&value.trim().length>=3;
const id=value=>typeof value==='string'&&/^[a-z][a-z0-9_-]{2,63}$/.test(value);
const rect=b=>b&&['x','y','width','height'].every(k=>Number.isFinite(b[k]))&&b.width>0&&b.height>0;
const inside=(a,b)=>rect(a)&&rect(b)&&a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width&&a.y+a.height<=b.y+b.height;
const pointInside=(p,b)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=b.x&&p.y>=b.y&&p.x<=b.x+b.width&&p.y<=b.y+b.height;
const edgeKey=e=>JSON.stringify([e.from,e.to,e.support_claim_id]);
export function compositionGeometryPromptBlock(spec){
 const qc=spec.pre_generation_checks,g=qc?.composition_geometry;
 return '[FROZEN_COMPOSITION_GEOMETRY]\n'+JSON.stringify({
  regions:g?.regions,labels:qc?.label_layout,connector_anchors:g?.connector_anchors
 })+'\n[/FROZEN_COMPOSITION_GEOMETRY]';
}
export function compositionPlanDigest(spec){
 const geometry=spec.pre_generation_checks?.composition_geometry;
 return crypto.createHash('sha256').update(JSON.stringify({
  story_id:spec.story_id,source_url:spec.source_url,composition:spec.composition_signature,
  native_generation_prompt:spec.native_generation_prompt,
  labels:spec.pre_generation_checks?.label_layout,edges:spec.allowed_causal_edges,
  regions:geometry?.regions,connector_anchors:geometry?.connector_anchors
 })).digest('hex');
}
export function validateCompositionGeometry(spec){
 if(spec.edition_date<IMAGE_LAYOUT_REQUIREMENTS.effective_date)return {result:'HISTORICAL_SPEC_UNCHANGED'};
 if(isAcceptedPreActivationSpecification(spec))return {result:'ACCEPTED_PREACTIVATION_SPEC_UNCHANGED'};
 const qc=spec.pre_generation_checks,g=qc?.composition_geometry;
 if(g?.schema_version!=='image-composition-geometry-v1'||!Array.isArray(g.regions)||
    g.regions.length!==spec.quality_review_plan?.major_regions||g.regions.length<3||g.regions.length>5)
   fail('story_specific_regions_required');
 const safe={x:40,y:40,width:1120,height:550},regions=new Map();
 for(const region of g.regions){
  if(!id(region.id)||regions.has(region.id)||!text(region.description)||!inside(region.bounding_box_px,safe))
   fail('invalid_duplicate_or_outside_region');
  regions.set(region.id,region);
 }
 const labels=new Map(),used=new Set();
 for(const label of qc.label_layout){
  const region=regions.get(label.region_id);
  if(!region||!inside(label.bounding_box_px,region.bounding_box_px))fail('label_not_inside_bound_region:'+label.label);
  if(label.bounding_box_px.height<label.minimum_font_px)fail('label_box_shorter_than_planned_font:'+label.label);
  labels.set(label.label,label);used.add(region.id);
 }
 if(used.size!==regions.size)fail('unexplained_composition_region');
 const edges=spec.allowed_causal_edges;
 if(!Array.isArray(g.connector_anchors)||g.connector_anchors.length!==edges.length)fail('exact_connector_anchors_required');
 const seen=new Set();
 for(const anchor of g.connector_anchors){
  const key=edgeKey(anchor),from=regions.get(anchor.from_region_id),to=regions.get(anchor.to_region_id);
  if(seen.has(key)||!edges.some(e=>edgeKey(e)===key)||!from||!to||
     !pointInside(anchor.origin_px,from.bounding_box_px)||!pointInside(anchor.target_px,to.bounding_box_px)||
     (anchor.origin_px.x===anchor.target_px.x&&anchor.origin_px.y===anchor.target_px.y))fail('invalid_or_duplicate_connector_anchor');
  if((labels.has(anchor.from)&&labels.get(anchor.from).region_id!==anchor.from_region_id)||
     (labels.has(anchor.to)&&labels.get(anchor.to).region_id!==anchor.to_region_id))fail('connector_endpoint_label_region_mismatch');
  seen.add(key);
 }
 const prompt=spec.native_generation_prompt,block=compositionGeometryPromptBlock(spec);
 if(!text(prompt)||!prompt.includes(block)||prompt.indexOf(block)!==prompt.lastIndexOf(block))
   fail('exact_generation_prompt_with_geometry_required');
 const review=g.prompt_geometry_review;
 if(review?.result!=='PASS'||!text(review.reviewer)||review.regions_match_composition!==true||
    review.labels_match_regions!==true||review.connectors_match_source!==true||
    review.geometry_sha256!==compositionPlanDigest(spec))fail('exact_plan_semantic_review_required');
 return {result:'COMPOSITION_PLAN_BOUND_NOT_PIXEL_APPROVAL',region_count:regions.size,connector_count:seen.size};
}
