import crypto from 'node:crypto';
import {validateCorrection} from './corrections.mjs';

const sha256=text=>crypto.createHash('sha256').update(text).digest('hex');

function replaceAt(array,index,value,label){
  if(!Array.isArray(array)||!Number.isInteger(index)||index<0||index>=array.length) throw new Error('correction_target_'+label);
  const out=structuredClone(array);out[index]=structuredClone(value);return out;
}

export function applyCorrectionToBundle(bundle,correction){
  const errors=validateCorrection(correction);
  if(errors.length) throw new Error('correction_invalid:'+errors.join(','));
  if(correction.status!=='VALIDATED') throw new Error('correction_must_be_validated');
  if(bundle?.edition_date!==correction.edition_date) throw new Error('correction_edition_mismatch');
  const out=structuredClone(bundle),t=correction.target||{},r=correction.replacement||{};

  if(correction.correction_type==='replace_article'){
    const i=out.stories.findIndex(x=>x.id===t.story_id);
    if(i<0||!r.story||r.story.id!==t.story_id) throw new Error('correction_story_target');
    out.stories[i]=structuredClone(r.story);
    if(Array.isArray(r.book_mappings)) out.book_mappings=structuredClone(r.book_mappings);
  }else if(correction.correction_type==='replace_image'){
    const i=out.images.findIndex(x=>x.story_id===t.story_id);
    if(i<0||!r.image||r.image.story_id!==t.story_id||r.image.accepted!==true) throw new Error('correction_image_target');
    out.images[i]=structuredClone(r.image);
    if(r.image_system) out.image_system=structuredClone(r.image_system);
  }else if(correction.correction_type==='replace_video'){
    out.videos=replaceAt(out.videos,t.index,r.video,'video');
  }else if(correction.correction_type==='replace_podcast'){
    out.podcasts=replaceAt(out.podcasts,t.index,r.podcast,'podcast');
  }else if(correction.correction_type==='replace_watchlist_item'){
    const state=t.state;
    if(!Array.isArray(out.watchlist?.[state])) throw new Error('correction_watchlist_state');
    const i=out.watchlist[state].findIndex(x=>x.topic===t.topic);
    if(i<0||!r.item) throw new Error('correction_watchlist_target');
    out.watchlist[state][i]=structuredClone(r.item);
  }else if(correction.correction_type==='add_watchlist_item'){
    const state=r.state;
    if(!Array.isArray(out.watchlist?.[state])||!r.item) throw new Error('correction_watchlist_add');
    if(out.watchlist[state].some(x=>x.topic===r.item.topic)) throw new Error('correction_watchlist_duplicate');
    out.watchlist[state].push(structuredClone(r.item));
  }else if(correction.correction_type==='remove_watchlist_item'){
    const state=t.state;
    if(!Array.isArray(out.watchlist?.[state])) throw new Error('correction_watchlist_state');
    const before=out.watchlist[state].length;
    out.watchlist[state]=out.watchlist[state].filter(x=>x.topic!==t.topic);
    if(out.watchlist[state].length===before) throw new Error('correction_watchlist_target');
  }

  out.corrections=[...(out.corrections||[]),{
    correction_id:correction.correction_id,
    correction_type:correction.correction_type,
    correction_revision:correction.correction_revision,
    reason:correction.reason,
    preserve_original:true
  }];
  return out;
}

export function buildCorrectionRecompileState({beforeState,beforeBundle,correctedBundle,correctedBundleText,correction,updatedAt=new Date().toISOString()}={}){
  if(beforeState?.state!=='SHADOW_VERIFIED'||beforeState?.stage!=='VERIFY') throw new Error('correction_requires_verified_edition');
  if(beforeState?.edition_date!==beforeBundle?.edition_date||beforeBundle?.edition_date!==correctedBundle?.edition_date) throw new Error('correction_edition_identity');
  if(correction?.new_execution_allowed!==false) throw new Error('correction_new_execution_forbidden');
  if(typeof correctedBundleText!=='string'||!correctedBundleText) throw new Error('corrected_bundle_text_required');
  const next=structuredClone(beforeState);
  next.state='BUNDLE_READY';next.stage='BUNDLE';next.updated_at=updatedAt;
  next.bundle={status:'BUNDLE_READY',digest:sha256(correctedBundleText)};
  next.last_error=null;next.retryable=false;
  delete next.preview;delete next.reader_parity;
  next.corrections={
    active_correction_id:correction.correction_id,
    revision:correction.correction_revision,
    type:correction.correction_type,
    status:'VALIDATED'
  };
  return next;
}
