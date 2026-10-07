import {D0_STRATEGY,d0StateComplete} from '../image-capsules/state.mjs';

const TERMINAL = new Set(['SHADOW_VERIFIED','SHADOW_FAILED']);
const POST_SEMANTIC = new Set(['BUNDLE_READY','COMPILING','PREVIEW_READY','SHADOW_VERIFIED']);
const STAGE_ORDER = new Map([['EDITORIAL',0],['CONTENT',1],['IMAGES',2],['BUNDLE',3],['COMPILE',4],['VERIFY',5]]);
const D0_IMAGE_STAGE_ORDER=new Map([['PLANNED',0],['IN_PROGRESS',1],['SET_REVIEW_READY',2],['SET_PASS',3],['ACCEPTED',4],['BLOCKED_INFRASTRUCTURE',1]]);

export function isTerminal(state) { return TERMINAL.has(state.state); }

export function firstIncompleteSemanticStage(state) {
  if (!state || isTerminal(state) || POST_SEMANTIC.has(state.state)) return null;
  if (state.state === 'ALLOCATED') return 'EDITORIAL';
  if (state.state !== 'PRODUCING') throw new Error('unsupported nonterminal semantic state: '+state.state);
  if (state.stage === 'EDITORIAL') return 'EDITORIAL';
  if (state.stage === 'CONTENT') return 'CONTENT';
  if (state.stage === 'IMAGES') {
    if(state.images?.strategy===D0_STRATEGY) return d0StateComplete(state)?'BUNDLE':'IMAGES';
    const accepted = state.images?.accepted || [];
    return accepted.length < 6 ? 'IMAGES' : 'BUNDLE';
  }
  if (state.stage === 'BUNDLE') return 'BUNDLE';
  return null;
}

export function nextImageOrdinal(state) {
  if (firstIncompleteSemanticStage(state) !== 'IMAGES') return null;
  if(state.images?.strategy===D0_STRATEGY) return null;
  const accepted = state.images?.accepted || [];
  return accepted.length + 1;
}

export function assertProgressPreserved(previous, next) {
  if (previous.edition_date !== next.edition_date) throw new Error('edition identity changed');
  if (previous.execution_id !== next.execution_id) throw new Error('execution identity changed');
  if (previous.branch !== next.branch) throw new Error('branch identity changed');

  const prevStage = STAGE_ORDER.get(previous.stage), nextStage = STAGE_ORDER.get(next.stage);
  if (prevStage === undefined || nextStage === undefined) throw new Error('unknown stage');
  if (nextStage < prevStage) throw new Error('semantic stage regressed');
  if (previous.editorial_bundle?.status === 'complete' && next.editorial_bundle?.status !== 'complete') throw new Error('completed editorial bundle was invalidated');

  const before = previous.images?.accepted || [], after = next.images?.accepted || [];
  if (new Set(after).size !== after.length) throw new Error('accepted image list contains duplicates');
  if (after.length < before.length) throw new Error('accepted images were removed');
  for (let i=0;i<before.length;i++) if (before[i] !== after[i]) throw new Error('accepted image identity changed');

  if(previous.images?.strategy===D0_STRATEGY||next.images?.strategy===D0_STRATEGY){
    if(previous.images?.strategy&&next.images?.strategy!==previous.images.strategy) throw new Error('image strategy changed');
    if(previous.images?.set_plan_sha256&&next.images?.set_plan_sha256!==previous.images.set_plan_sha256) throw new Error('image set plan changed');
    const p=D0_IMAGE_STAGE_ORDER.get(previous.images?.stage_state),n=D0_IMAGE_STAGE_ORDER.get(next.images?.stage_state);
    if(p!==undefined&&n!==undefined&&previous.images?.stage_state!=='BLOCKED_INFRASTRUCTURE'&&n<p) throw new Error('D0 image stage regressed');
    if(previous.images?.acceptance?.status==='ACCEPTED_LOCKED'&&next.images?.acceptance?.status!=='ACCEPTED_LOCKED') throw new Error('D0 accepted lock removed');
  }

  if (previous.bundle?.status === 'BUNDLE_READY') {
    if (next.bundle?.status !== 'BUNDLE_READY') throw new Error('sealed bundle was reopened');
    if (next.bundle?.digest !== previous.bundle?.digest) throw new Error('sealed bundle digest changed');
  }
  return true;
}

function dateValue(state) { return Date.parse(state.updated_at || state.started_at || state.edition_date+'T00:00:00Z'); }

export function newestNonterminal(states) {
  const candidates=(states||[]).filter(s=>s && !isTerminal(s) && !POST_SEMANTIC.has(s.state));
  candidates.sort((a,b)=>dateValue(b)-dateValue(a));
  return candidates[0] || null;
}

export function recoveryDecision(states) {
  const state=newestNonterminal(states);
  if(!state) return {action:'EXIT_NO_MUTATION',reason:'NO_NONTERMINAL_SHADOW_EDITION'};
  const stage=firstIncompleteSemanticStage(state);
  if(!stage) return {action:'EXIT_NO_MUTATION',reason:'NO_INCOMPLETE_SEMANTIC_STAGE',execution_id:state.execution_id};
  return {
    action:'RESUME',
    edition_date:state.edition_date,
    execution_id:state.execution_id,
    branch:state.branch,
    stage,
    image_strategy:stage==='IMAGES'?(state.images?.strategy??'legacy'):null,
    next_image_ordinal:stage==='IMAGES'?nextImageOrdinal(state):null
  };
}

export function primaryDecision(states, targetEditionDate) {
  const same=(states||[]).filter(s=>s?.edition_date===targetEditionDate);
  const active=same.find(s=>!isTerminal(s) && !POST_SEMANTIC.has(s.state));
  if(active) return {action:'RESUME',execution_id:active.execution_id,branch:active.branch,stage:firstIncompleteSemanticStage(active)};
  const complete=same.find(s=>s?.state==='SHADOW_VERIFIED');
  if(complete) return {action:'EXIT_NO_MUTATION',reason:'EDITION_ALREADY_SHADOW_VERIFIED',execution_id:complete.execution_id};
  const sealed=same.find(s=>POST_SEMANTIC.has(s?.state));
  if(sealed) return {action:'EXIT_NO_MUTATION',reason:'SEMANTIC_WORK_ALREADY_COMPLETE',execution_id:sealed.execution_id};
  return {action:'ALLOCATE',edition_date:targetEditionDate,branch:'shadow/'+targetEditionDate};
}
