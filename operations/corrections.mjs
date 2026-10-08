export const CORRECTION_SCHEMA='daily-compiler-post-publication-correction-v1';
const ORDER=['REQUESTED','VALIDATED','PR_OPEN','MERGED','DEPLOYED','VERIFIED'];

export function validateCorrection(c={}){
  const errors=[];
  if(c.schema_version!==CORRECTION_SCHEMA) errors.push('correction_schema');
  for(const k of ['correction_id','edition_date','requested_at','requested_by','correction_type','reason','status','semantic_scope']){
    if(typeof c[k]!=='string'||!c[k].trim()) errors.push('correction_'+k);
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(c.edition_date||'')) errors.push('correction_edition_date');
  if(typeof c.requested_at!=='string'||!Number.isFinite(Date.parse(c.requested_at))) errors.push('correction_requested_at');
  if(!['owner','system'].includes(c.requested_by)) errors.push('correction_requested_by');
  for(const k of ['target','replacement']) if(!c[k]||typeof c[k]!=='object'||Array.isArray(c[k])) errors.push('correction_'+k);
  if(!['replace_article','replace_image','replace_video','replace_podcast','replace_watchlist_item','add_watchlist_item','remove_watchlist_item'].includes(c.correction_type)) errors.push('correction_type');
  if(!['REQUESTED','VALIDATED','PR_OPEN','MERGED','DEPLOYED','VERIFIED','BLOCKED','CANCELLED'].includes(c.status)) errors.push('correction_status');
  if(c.preserve_original!==true||c.new_execution_allowed!==false||c.protected_pr_required!==true||c.live_verification_required!==true) errors.push('correction_invariants');
  if(!Number.isInteger(c.correction_revision)||c.correction_revision<1) errors.push('correction_revision');
  const scope={replace_article:'content_only',replace_image:'image_only',replace_video:'media_only',replace_podcast:'media_only',replace_watchlist_item:'watchlist_only',add_watchlist_item:'watchlist_only',remove_watchlist_item:'watchlist_only'};
  if(scope[c.correction_type]!==c.semantic_scope) errors.push('correction_semantic_scope');
  if(c.revision_id!==undefined&&(typeof c.revision_id!=='string'||!c.revision_id.trim())) errors.push('correction_revision_id');
  if(c.status==='VERIFIED'&&(typeof c.verification_receipt_path!=='string'||!c.verification_receipt_path.trim())) errors.push('correction_verification_receipt_required');
  return [...new Set(errors)];
}

export function transitionCorrection(c,nextStatus,{verificationReceiptPath=null}={}){
  const errors=validateCorrection(c);
  if(errors.length) throw new Error(errors.join(';'));
  if(nextStatus==='BLOCKED'||nextStatus==='CANCELLED') return {...structuredClone(c),status:nextStatus};
  const from=ORDER.indexOf(c.status),to=ORDER.indexOf(nextStatus);
  if(from<0||to!==from+1) throw new Error('illegal_correction_transition');
  const n={...structuredClone(c),status:nextStatus};
  if(nextStatus==='VERIFIED'){
    if(!verificationReceiptPath) throw new Error('correction_verification_receipt_required');
    n.verification_receipt_path=verificationReceiptPath;
  }
  return n;
}

export function correctionRequiresVisualReview(c){
  const errors=validateCorrection(c);
  if(errors.length) throw new Error(errors.join(';'));
  // Acceptance is produced in the existing story runtime. Applying a correction
  // validates that evidence and never asks GitHub to perform a subjective rereview.
  return false;
}
